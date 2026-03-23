import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const COURSE_ID_FROM_ENV = __ENV.ENROLL_COURSE_ID || '';
const PROFILE = __ENV.K6_PROFILE || 'full';

const stageProfiles = {
  full: {
    studentRead: [
      { duration: '2m', target: 500 },
      { duration: '3m', target: 2000 },
      { duration: '5m', target: 4500 },
      { duration: '7m', target: 6500 },
      { duration: '5m', target: 6500 },
      { duration: '3m', target: 0 },
    ],
    studentEnroll: [
      { duration: '2m', target: 200 },
      { duration: '3m', target: 1200 },
      { duration: '5m', target: 2200 },
      { duration: '7m', target: 3000 },
      { duration: '5m', target: 3000 },
      { duration: '3m', target: 0 },
    ],
    teacherUpload: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 200 },
      { duration: '5m', target: 350 },
      { duration: '7m', target: 500 },
      { duration: '5m', target: 500 },
      { duration: '3m', target: 0 },
    ],
  },
  medium: {
    studentRead: [
      { duration: '1m', target: 1500 },
      { duration: '2m', target: 4500 },
      { duration: '2m', target: 6500 },
      { duration: '1m', target: 0 },
    ],
    studentEnroll: [
      { duration: '1m', target: 800 },
      { duration: '2m', target: 2200 },
      { duration: '2m', target: 3000 },
      { duration: '1m', target: 0 },
    ],
    teacherUpload: [
      { duration: '1m', target: 120 },
      { duration: '2m', target: 350 },
      { duration: '2m', target: 500 },
      { duration: '1m', target: 0 },
    ],
  },
  quick: {
    studentRead: [
      { duration: '30s', target: 2000 },
      { duration: '1m', target: 6500 },
      { duration: '30s', target: 0 },
    ],
    studentEnroll: [
      { duration: '30s', target: 1000 },
      { duration: '1m', target: 3000 },
      { duration: '30s', target: 0 },
    ],
    teacherUpload: [
      { duration: '30s', target: 150 },
      { duration: '1m', target: 500 },
      { duration: '30s', target: 0 },
    ],
  },
};

const activeStages = stageProfiles[PROFILE] || stageProfiles.full;

const enrollmentAcceptedRate = new Rate('enrollment_accepted_rate');
const teacherUploadSuccessRate = new Rate('teacher_upload_success_rate');
const readSuccessRate = new Rate('read_success_rate');
const enrollmentAttempts = new Counter('enrollment_attempts');
const teacherUploadAttempts = new Counter('teacher_upload_attempts');

export const options = {
  discardResponseBodies: false,
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
  batch: 3,
  batchPerHost: 3,
  scenarios: {
    student_read: {
      executor: 'ramping-vus',
      exec: 'studentReadFlow',
      stages: activeStages.studentRead,
      gracefulRampDown: '30s',
    },
    student_enroll: {
      executor: 'ramping-vus',
      exec: 'studentEnrollFlow',
      stages: activeStages.studentEnroll,
      gracefulRampDown: '30s',
    },
    teacher_upload: {
      executor: 'ramping-vus',
      exec: 'teacherUploadFlow',
      stages: activeStages.teacherUpload,
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000', 'p(99)<6000'],
    enrollment_accepted_rate: ['rate>0.85'],
    teacher_upload_success_rate: ['rate>0.85'],
    read_success_rate: ['rate>0.95'],
  },
};

function buildHeaders(role, userId, email) {
  return {
    'Content-Type': 'application/json',
    Connection: 'keep-alive',
    'x-e2e-role': role,
    'x-e2e-user-id': userId,
    'x-e2e-email': email,
  };
}

function parseJsonSafe(response) {
  try {
    return response.json();
  } catch (_) {
    return null;
  }
}

function pickCourseIdFromPayload(payload) {
  if (!payload) return null;

  const directId =
    (payload.data && payload.data.id) ||
    payload.id;
  if (directId) return directId;

  const lists = [
    payload,
    payload.data,
    payload.courses,
    payload.data && payload.data.courses,
  ];

  for (const item of lists) {
    if (Array.isArray(item) && item.length > 0) {
      const first = item[0];
      if (first && first.id) return first.id;
    }
  }

  return null;
}

export function setup() {
  if (COURSE_ID_FROM_ENV) {
    return { enrollCourseId: COURSE_ID_FROM_ENV };
  }

  const teacherHeaders = buildHeaders('teacher', 'k6-seed-teacher', 'k6-seed-teacher@academy.local');
  const adminHeaders = buildHeaders('admin', 'k6-seed-admin', 'k6-seed-admin@academy.local');

  const unique = Date.now();
  const createRes = http.post(
    `${BASE_URL}/api/courses`,
    JSON.stringify({
      title: `K6 Seed Course ${unique}`,
      description: 'Seed course for mixed 10k activity test',
      is_free: true,
      price: 0,
      duration_weeks: 4,
      approval_status: 'draft',
    }),
    { headers: teacherHeaders }
  );

  const createPayload = parseJsonSafe(createRes);
  const createdId = pickCourseIdFromPayload(createPayload);

  if (createdId) {
    http.post(
      `${BASE_URL}/api/teacher/courses/${createdId}/submit-for-approval`,
      null,
      { headers: teacherHeaders }
    );

    http.post(
      `${BASE_URL}/api/admin/courses/${createdId}/approve`,
      null,
      { headers: adminHeaders }
    );

    return { enrollCourseId: createdId };
  }

  const fallbackList = http.get(`${BASE_URL}/api/courses?approval_status=approved`);
  const fallbackPayload = parseJsonSafe(fallbackList);
  const fallbackId = pickCourseIdFromPayload(fallbackPayload);

  return { enrollCourseId: fallbackId || null };
}

export function studentReadFlow() {
  const headers = { headers: { Connection: 'keep-alive' } };

  const health = http.get(`${BASE_URL}/api/health`, headers);
  const list = http.get(`${BASE_URL}/api/courses?approval_status=approved`, headers);
  const allCourses = http.get(`${BASE_URL}/api/courses`, headers);

  const ok =
    health.status === 200 &&
    (list.status === 200 || list.status === 304) &&
    (allCourses.status >= 200 && allCourses.status < 500);

  check(health, { 'read flow health 200': (r) => r.status === 200 });
  check(list, { 'read flow approved list ok': (r) => r.status === 200 || r.status === 304 });
  check(allCourses, { 'read flow courses reachable': (r) => r.status >= 200 && r.status < 500 });
  readSuccessRate.add(ok);

  sleep(0.2);
}

export function studentEnrollFlow(data) {
  enrollmentAttempts.add(1);

  const courseId = data && data.enrollCourseId;
  if (!courseId) {
    enrollmentAcceptedRate.add(false);
    sleep(0.5);
    return;
  }

  const userSuffix = `${__VU}-${__ITER}`;
  const headers = {
    headers: buildHeaders('student', `k6-student-${userSuffix}`, `k6-student-${userSuffix}@academy.local`),
  };

  const payload = {
    course_id: courseId,
    fullName: `K6 Student ${userSuffix}`,
    email: `k6-student-${userSuffix}@academy.local`,
    mobileNumber: '01000000000',
  };

  const enrollRes = http.post(
    `${BASE_URL}/api/enrollments/enroll`,
    JSON.stringify(payload),
    headers
  );

  const accepted =
    enrollRes.status === 201 ||
    enrollRes.status === 409 ||
    enrollRes.status === 400;

  check(enrollRes, {
    'enroll response accepted': (r) => r.status === 201 || r.status === 409 || r.status === 400,
  });
  enrollmentAcceptedRate.add(accepted);

  sleep(0.8);
}

export function teacherUploadFlow() {
  teacherUploadAttempts.add(1);

  const userSuffix = `${__VU}-${__ITER}`;
  const headers = {
    headers: buildHeaders('teacher', `k6-teacher-${userSuffix}`, `k6-teacher-${userSuffix}@academy.local`),
  };

  const titleSuffix = `${Date.now()}-${userSuffix}`;
  const createRes = http.post(
    `${BASE_URL}/api/courses`,
    JSON.stringify({
      title: `K6 Upload ${titleSuffix}`,
      description: 'Teacher upload stress flow',
      is_free: true,
      price: 0,
      duration_weeks: 4,
      approval_status: 'draft',
    }),
    headers
  );

  const created = createRes.status === 201;
  let submitted = false;

  if (created) {
    const payload = parseJsonSafe(createRes);
    const courseId = pickCourseIdFromPayload(payload);

    if (courseId) {
      const submitRes = http.post(
        `${BASE_URL}/api/teacher/courses/${courseId}/submit-for-approval`,
        null,
        headers
      );
      submitted = submitRes.status === 200;
    }
  }

  check(createRes, { 'teacher upload create course 201': (r) => r.status === 201 });
  teacherUploadSuccessRate.add(created && submitted);

  sleep(1.2);
}
