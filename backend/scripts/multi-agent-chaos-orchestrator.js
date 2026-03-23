require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.CHAOS_TEST_BASE_URL || 'http://localhost:5000';
const E2E_BYPASS = process.env.CHAOS_TEST_E2E_BYPASS !== 'false';
const USER_EMAIL = process.env.CHAOS_TEST_USER_EMAIL || 'teacher@gmail.com';
const USER_ID = process.env.CHAOS_TEST_USER_ID || 'chaos-shared-user';
const REQUEST_TIMEOUT_MS = Number(process.env.CHAOS_TEST_TIMEOUT_MS || 8000);

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

class ChaosAgent {
  constructor(config = {}) {
    this.config = {
      delayChance: config.delayChance ?? 0.35,
      timeoutChance: config.timeoutChance ?? 0.1,
      malformedChance: config.malformedChance ?? 0.12,
      partialFailureChance: config.partialFailureChance ?? 0.15,
      minDelayMs: config.minDelayMs ?? 150,
      maxDelayMs: config.maxDelayMs ?? 1800,
    };
  }

  randomDelay() {
    const { minDelayMs, maxDelayMs } = this.config;
    return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  }

  should(probability) {
    return Math.random() < probability;
  }

  async inject(stepName, executor) {
    if (this.should(this.config.delayChance)) {
      await new Promise((resolve) => setTimeout(resolve, this.randomDelay()));
    }

    if (this.should(this.config.timeoutChance)) {
      throw new TimeoutError(`[ChaosAgent] Forced timeout at ${stepName}`);
    }

    const result = await executor();

    if (this.should(this.config.malformedChance)) {
      return {
        status: result.status,
        data: { malformed: true, payload: null, note: `Malformed by chaos at ${stepName}` },
      };
    }

    if (this.should(this.config.partialFailureChance)) {
      if (result && typeof result === 'object' && result.data && typeof result.data === 'object') {
        const clone = { ...result, data: { ...result.data } };
        delete clone.data.success;
        delete clone.data.data;
        return clone;
      }
    }

    return result;
  }
}

class StudentSimulator {
  constructor(log) {
    this.log = log;
  }

  generateInputs() {
    return [
      { type: 'valid', topic: 'tajweed basics', context: 'beginner' },
      { type: 'invalid', topic: '', context: null },
      { type: 'random', topic: `rand-${Math.random().toString(36).slice(2, 9)}`, context: { noise: true } },
      { type: 'incomplete', topic: 'aqeedah' },
    ];
  }

  async spam(executor, concurrency = 25) {
    const inputs = Array.from({ length: concurrency }).map((_, index) => ({
      type: 'spam',
      topic: `spam-topic-${index}`,
      context: 'high-frequency',
    }));

    const started = Date.now();
    const settled = await Promise.allSettled(inputs.map((input) => executor(input)));
    const durationMs = Date.now() - started;

    const fulfilled = settled.filter((x) => x.status === 'fulfilled').length;
    const rejected = settled.length - fulfilled;

    this.log('StudentSimulator', 'spam', 'completed', {
      concurrency,
      fulfilled,
      rejected,
      durationMs,
    });

    return { concurrency, fulfilled, rejected, durationMs };
  }
}

class TeacherSimulator {
  constructor(log) {
    this.log = log;
  }

  validateResponse(name, response, expectedStatuses = [200, 201]) {
    const issues = [];

    if (!response || typeof response !== 'object') {
      issues.push('empty_response');
    }

    if (!expectedStatuses.includes(response.status)) {
      issues.push(`unexpected_status_${response.status}`);
    }

    const payload = response?.data;
    const serialized = JSON.stringify(payload || {});

    if (/undefined|\[object Object\]/i.test(serialized)) {
      issues.push('hallucination_like_payload');
    }

    if (payload?.malformed) {
      issues.push('malformed_output_detected');
    }

    const ok = issues.length === 0;
    this.log('TeacherSimulator', name, ok ? 'validated' : 'flagged', { issues });
    return { ok, issues };
  }
}

class AdminSimulator {
  constructor(log) {
    this.log = log;
  }

  async review(taskName) {
    const roll = Math.random();

    if (roll < 0.2) {
      const delayMs = Math.floor(Math.random() * 2000) + 500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      this.log('AdminSimulator', taskName, 'delayed', { delayMs });
      return { decision: 'approved', delayed: true, delayMs };
    }

    if (roll < 0.33) {
      this.log('AdminSimulator', taskName, 'rejected', { reason: 'random_rejection_for_resilience' });
      return { decision: 'rejected' };
    }

    this.log('AdminSimulator', taskName, 'approved', {});
    return { decision: 'approved' };
  }
}

class TestOrchestrator {
  constructor() {
    this.logs = [];
    this.results = [];
    this.chaos = new ChaosAgent();
    this.student = new StudentSimulator(this.log.bind(this));
    this.teacher = new TeacherSimulator(this.log.bind(this));
    this.admin = new AdminSimulator(this.log.bind(this));
    this.waitGraph = new Map();
  }

  log(actor, action, status, details = {}) {
    this.logs.push({
      ts: new Date().toISOString(),
      actor,
      action,
      status,
      details,
    });
  }

  async api(method, urlPath, { role, body } = {}) {
    const headers = { 'Content-Type': 'application/json' };

    if (E2E_BYPASS && role) {
      headers['x-e2e-role'] = role;
      headers['x-e2e-user-id'] = USER_ID;
      headers['x-e2e-email'] = USER_EMAIL;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}${urlPath}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return { status: response.status, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  async withRetry(stepName, fn, retries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        const result = await fn();
        if (attempt > 1) {
          this.log('Orchestrator', stepName, 'retry_succeeded', { attempt });
        }
        return { result, attempts: attempt, usedFallback: false };
      } catch (error) {
        lastError = error;
        this.log('Orchestrator', stepName, 'retry_failed', {
          attempt,
          message: error?.message || String(error),
        });
      }
    }

    return {
      result: {
        status: 503,
        data: {
          success: false,
          fallback: true,
          message: `Fallback triggered for ${stepName}`,
        },
      },
      attempts: retries + 1,
      usedFallback: true,
      lastError,
    };
  }

  setWait(agent, waitingFor) {
    this.waitGraph.set(agent, waitingFor);
  }

  clearWait(agent) {
    this.waitGraph.delete(agent);
  }

  detectDeadlock() {
    const visited = new Set();
    const inStack = new Set();

    const hasCycle = (node) => {
      if (inStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      inStack.add(node);

      const next = this.waitGraph.get(node);
      if (next && hasCycle(next)) return true;

      inStack.delete(node);
      return false;
    };

    for (const node of this.waitGraph.keys()) {
      if (hasCycle(node)) return true;
    }

    return false;
  }

  recordScenario(name, ok, details = {}) {
    this.results.push({
      name,
      ok,
      details,
    });
  }

  async runFunctionalScenario() {
    const scenarioName = 'functional_student_teacher_admin_flow';
    const inputs = this.student.generateInputs();
    const request = inputs[0];

    const fetchCourses = await this.withRetry('student_request_lesson', () =>
      this.chaos.inject('student_request_lesson', () => this.api('GET', '/api/courses'))
    );
    const validation1 = this.teacher.validateResponse('student_request_lesson', fetchCourses.result, [200]);

    const createCourse = await this.withRetry('teacher_generate_content', () =>
      this.chaos.inject('teacher_generate_content', () =>
        this.api('POST', '/api/courses', {
          role: 'teacher',
          body: {
            title: `Chaos Test Course ${Date.now()}`,
            description: `Generated from request ${request.topic}`,
            is_free: true,
            price: 0,
            duration_weeks: 4,
            approval_status: 'draft',
          },
        })
      )
    );
    const validation2 = this.teacher.validateResponse('teacher_generate_content', createCourse.result, [201]);

    const courseId =
      createCourse.result?.data?.data?.id ||
      createCourse.result?.data?.id ||
      null;

    let submitStatus = { status: 0 };
    let approveStatus = { status: 0 };

    if (courseId) {
      submitStatus = (await this.withRetry('teacher_submit_for_approval', () =>
        this.chaos.inject('teacher_submit_for_approval', () =>
          this.api('POST', `/api/teacher/courses/${courseId}/submit-for-approval`, { role: 'teacher' })
        )
      )).result;

      const review = await this.admin.review('admin_approval');
      if (review.decision === 'approved') {
        approveStatus = (await this.withRetry('admin_approve_course', () =>
          this.chaos.inject('admin_approve_course', () =>
            this.api('POST', `/api/admin/courses/${courseId}/approve`, { role: 'admin' })
          )
        )).result;
      } else {
        approveStatus = { status: 409, data: { rejected: true } };
      }
    }

    const studentReceives = await this.withRetry('student_receive_course', () =>
      this.chaos.inject('student_receive_course', () => this.api('GET', '/api/courses?approval_status=approved'))
    );
    const validation3 = this.teacher.validateResponse('student_receive_course', studentReceives.result, [200]);

    const ok =
      validation1.ok &&
      validation2.ok &&
      validation3.ok &&
      submitStatus.status === 200 &&
      (approveStatus.status === 200 || approveStatus.status === 409);

    this.recordScenario(scenarioName, ok, {
      courseId,
      statuses: {
        fetchCourses: fetchCourses.result.status,
        createCourse: createCourse.result.status,
        submitStatus: submitStatus.status,
        approveStatus: approveStatus.status,
        studentReceives: studentReceives.result.status,
      },
      retries: {
        fetchCourses: fetchCourses.attempts,
        createCourse: createCourse.attempts,
        studentReceives: studentReceives.attempts,
      },
      fallbackUsed:
        fetchCourses.usedFallback || createCourse.usedFallback || studentReceives.usedFallback,
    });
  }

  async runDelayScenario() {
    const scenarioName = 'admin_delay_should_not_freeze';

    const start = Date.now();
    const decision = await this.admin.review('delay_resilience_review');
    const elapsed = Date.now() - start;

    const ok = elapsed < REQUEST_TIMEOUT_MS * 2;

    this.recordScenario(scenarioName, ok, {
      decision,
      elapsedMs: elapsed,
      thresholdMs: REQUEST_TIMEOUT_MS * 2,
    });
  }

  async runFailureScenario() {
    const scenarioName = 'teacher_failure_retry_or_fallback';

    const result = await this.withRetry('forced_teacher_failure', async () => {
      throw new Error('Simulated teacher generation failure');
    }, 2);

    const ok = result.usedFallback === true && result.result.status === 503;

    this.recordScenario(scenarioName, ok, {
      attempts: result.attempts,
      usedFallback: result.usedFallback,
      fallbackStatus: result.result.status,
      lastError: result.lastError?.message,
    });
  }

  async runDeadlockScenario() {
    const scenarioName = 'deadlock_detection_and_escape';

    this.setWait('StudentAgent', 'TeacherAgent');
    this.setWait('TeacherAgent', 'AdminAgent');
    this.setWait('AdminAgent', 'StudentAgent');

    const deadlocked = this.detectDeadlock();
    if (deadlocked) {
      this.log('Orchestrator', 'deadlock_detected', 'detected', {
        graph: Array.from(this.waitGraph.entries()),
      });
      this.waitGraph.clear();
      this.log('Orchestrator', 'deadlock_detected', 'resolved', {
        strategy: 'force_clear_wait_graph',
      });
    }

    this.recordScenario(scenarioName, deadlocked, {
      deadlocked,
      resolved: deadlocked,
    });
  }

  async runLoadScenario(concurrency) {
    const scenarioName = `load_${concurrency}_concurrent_users`;

    const output = await this.student.spam(async () =>
      this.chaos.inject(`load_${concurrency}`, () => this.api('GET', '/api/courses')),
    concurrency);

    const successRate = output.fulfilled / concurrency;
    const ok = successRate >= 0.8;

    this.recordScenario(scenarioName, ok, {
      ...output,
      successRate,
    });
  }

  async runAll() {
    this.log('Orchestrator', 'start', 'running', {
      baseUrl: BASE_URL,
      e2eBypass: E2E_BYPASS,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    await this.runFunctionalScenario();
    await this.runDelayScenario();
    await this.runFailureScenario();
    await this.runDeadlockScenario();

    for (const users of [10, 50, 100]) {
      await this.runLoadScenario(users);
    }

    this.log('Orchestrator', 'complete', 'done', {});

    return this.buildReport();
  }

  buildReport() {
    const passed = this.results.filter((r) => r.ok).length;
    const failed = this.results.length - passed;

    const performanceIssues = this.results
      .filter((r) => r.name.startsWith('load_') && !r.ok)
      .map((r) => ({ scenario: r.name, details: r.details }));

    const deadlocks = this.results
      .filter((r) => r.name.includes('deadlock') && r.details.deadlocked)
      .map((r) => r.details);

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE_URL,
      },
      summary: {
        scenarios: this.results.length,
        passed,
        failed,
      },
      scenarios: this.results,
      performanceIssues,
      deadlocks,
      logs: this.logs,
    };
  }
}

async function main() {
  const orchestrator = new TestOrchestrator();
  const report = await orchestrator.runAll();

  const reportsDir = path.resolve(__dirname, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const fileName = `chaos-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const reportPath = path.join(reportsDir, fileName);

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n=== MULTI-AGENT CHAOS TEST REPORT ===');
  console.log(`Scenarios: ${report.summary.scenarios}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Performance Issues: ${report.performanceIssues.length}`);
  console.log(`Deadlocks Detected: ${report.deadlocks.length}`);
  console.log(`Report: ${reportPath}`);

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal chaos test error:', error);
  process.exitCode = 1;
});
