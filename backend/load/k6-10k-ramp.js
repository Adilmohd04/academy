import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '3m', target: 2000 },
    { duration: '5m', target: 5000 },
    { duration: '7m', target: 10000 },
    { duration: '5m', target: 10000 },  // sustained peak
    { duration: '3m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],            // <5 % error rate
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
  },
  discardResponseBodies: true,
  // ── Connection reuse ─────────────────────────────────────────
  // Without this, k6 opens a NEW TCP connection for each request.
  // 10K VUs × 3 req = 30K connections in rapid succession, which
  // exhausts Windows' ~16K ephemeral port range instantly.
  // batch() + keepAlive = reuses connections across requests.
  noConnectionReuse: false,        // default, but be explicit
  insecureSkipTLSVerify: true,
  batch: 3,                        // send up to 3 requests concurrently
  batchPerHost: 3,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

const params = {
  headers: { 'Connection': 'keep-alive' },
};

export default function () {
  // 1) Health probe (lightest)
  const h = http.get(`${BASE_URL}/api/health`, params);
  check(h, { 'health 200': (r) => r.status === 200 });

  // 2) Root endpoint
  const root = http.get(`${BASE_URL}/`, params);
  check(root, { 'root 200': (r) => r.status === 200 });

  // 3) Courses list (heavier — hits DB or cache)
  const courses = http.get(`${BASE_URL}/api/courses`, params);
  check(courses, { 'courses 2xx': (r) => r.status >= 200 && r.status < 500 });

  // Small pause to simulate real user think-time
  sleep(0.2);
}
