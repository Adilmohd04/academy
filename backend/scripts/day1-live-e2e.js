require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const EMAIL = 'teacher@gmail.com';
const USER_ID = 'day1-shared-user';

const results = [];

function addResult(id, name, ok, details) {
  results.push({ id, name, ok, details });
}

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.courses)) return payload.courses;
  if (Array.isArray(payload?.data?.courses)) return payload.data.courses;
  return [];
}

async function api(method, path, { body, role } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (role) {
    headers['x-e2e-role'] = role;
    headers['x-e2e-user-id'] = USER_ID;
    headers['x-e2e-email'] = EMAIL;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  return { status: res.status, data };
}

(async () => {
  let courseId = null;
  try {
    const unauthTeacher = await api('GET', '/api/teacher/courses');
    addResult(
      'AUTH-004-A',
      'Unauthenticated teacher route blocked',
      unauthTeacher.status === 401,
      `status=${unauthTeacher.status}`
    );

    const teacherProfile = await api('GET', '/api/users/profile', { role: 'teacher' });
    addResult(
      'AUTH-001-A',
      'Teacher profile access',
      teacherProfile.status === 200,
      `status=${teacherProfile.status}`
    );

    const teacherCourses = await api('GET', '/api/teacher/courses', { role: 'teacher' });
    addResult(
      'AUTH-001-B',
      'Teacher routes accessible for teacher role',
      teacherCourses.status === 200,
      `status=${teacherCourses.status}`
    );

    const runLabel = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const uniqueTitle = `E2E Day1 Course - QA Run ${runLabel}`;
    const createCourse = await api('POST', '/api/courses', {
      role: 'teacher',
      body: {
        title: uniqueTitle,
        description: 'Day 1 live E2E course',
        is_free: true,
        price: 0,
        duration_weeks: 4,
        approval_status: 'draft',
      },
    });

    courseId = createCourse?.data?.data?.id || createCourse?.data?.id || null;
    addResult(
      'COURSE-001',
      'Teacher creates draft course',
      createCourse.status === 201 && !!courseId,
      `status=${createCourse.status}, courseId=${courseId || 'none'}`
    );

    if (courseId) {
      const submitApproval = await api('POST', `/api/teacher/courses/${courseId}/submit-for-approval`, {
        role: 'teacher',
      });
      addResult(
        'COURSE-003',
        'Teacher submits course for approval',
        submitApproval.status === 200,
        `status=${submitApproval.status}`
      );
    } else {
      addResult('COURSE-003', 'Teacher submits course for approval', false, 'blocked: no courseId from create');
    }

    const studentBlockedTeacherRoute = await api('GET', '/api/teacher/courses', { role: 'student' });
    addResult(
      'AUTH-004-B',
      'Student blocked from teacher route',
      studentBlockedTeacherRoute.status === 403,
      `status=${studentBlockedTeacherRoute.status}`
    );

    if (courseId) {
      const enroll = await api('POST', '/api/enrollments/enroll', {
        role: 'student',
        body: {
          course_id: courseId,
          fullName: 'E2E Student',
          email: EMAIL,
          mobileNumber: '01000000000',
        },
      });

      const enrollOk = enroll.status === 201 || (enroll.status === 400 && (enroll?.data?.error || '').toLowerCase().includes('already enrolled'));
      addResult(
        'COURSE-005',
        'Student enrolls in approved/free course',
        enrollOk,
        `status=${enroll.status}, message=${enroll?.data?.error || enroll?.data?.message || 'n/a'}`
      );
    } else {
      addResult('COURSE-005', 'Student enrolls in approved/free course', false, 'blocked: no courseId from create');
    }

    const adminPending = await api('GET', '/api/admin/courses/pending', { role: 'admin' });
    const pendingList = toList(adminPending?.data);
    const pendingHasCourse = !!courseId && Array.isArray(pendingList) && pendingList.some((c) => c.id === courseId);
    addResult(
      'AUTH-003',
      'Admin route accessible',
      adminPending.status === 200,
      `status=${adminPending.status}, pendingCount=${Array.isArray(pendingList) ? pendingList.length : 'n/a'}`
    );

    if (courseId) {
      const approve = await api('POST', `/api/admin/courses/${courseId}/approve`, { role: 'admin' });
      addResult(
        'COURSE-004',
        'Admin approves pending course',
        approve.status === 200,
        `status=${approve.status}`
      );
    } else {
      addResult('COURSE-004', 'Admin approves pending course', false, 'blocked: no courseId from create');
    }

    const publicCourses = await api('GET', '/api/courses?approval_status=approved');
    const approvedList = toList(publicCourses?.data);
    const foundInApproved = !!courseId && Array.isArray(approvedList) && approvedList.some((c) => c.id === courseId);
    addResult(
      'COURSE-002',
      'Course appears in approved listings',
      publicCourses.status === 200 && (!!courseId ? foundInApproved : true),
      `status=${publicCourses.status}, foundCourse=${foundInApproved}`
    );

    addResult(
      'COURSE-003-X',
      'Pending list includes submitted course before approval',
      courseId ? pendingHasCourse : false,
      `pendingHasCourse=${pendingHasCourse}`
    );
  } catch (err) {
    addResult('SCRIPT', 'Day1 live E2E script execution', false, err?.message || String(err));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log('\n=== DAY 1 LIVE E2E API RESULTS ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.id} | ${r.name} | ${r.details}`);
  }
  console.log(`\nSUMMARY: ${passed}/${results.length} passed, ${failed} failed`);

  if (failed > 0) process.exitCode = 1;
})();
