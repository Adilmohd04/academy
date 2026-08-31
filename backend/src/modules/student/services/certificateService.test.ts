import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type MockResponse = { data: unknown; error: unknown };

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn<() => Promise<MockResponse>>(),
  single: jest.fn<() => Promise<MockResponse>>(),
  insert: jest.fn().mockReturnThis(),
};

jest.mock('../../../config/database', () => ({
  supabase: mockSupabase,
}));

import {
  CertificateNotAvailableError,
  EnrollmentCertificateAccessError,
  generateCertificate,
} from './certificateService';

describe('student certificate issuance ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.in.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
  });

  it('does not issue a certificate when the enrollment is not owned by the authenticated student', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      generateCertificate('another-students-enrollment', 'authenticated-student')
    ).rejects.toBeInstanceOf(EnrollmentCertificateAccessError);

    expect(mockSupabase.from).toHaveBeenCalledWith('enrollments');
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(1, 'id', 'another-students-enrollment');
    expect(mockSupabase.eq).toHaveBeenNthCalledWith(2, 'student_id', 'authenticated-student');
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('never creates a legacy certificate when the central lifecycle has not issued one', async () => {
    mockSupabase.maybeSingle
      .mockResolvedValueOnce({
        data: { course_id: 'course-1', student_id: 'authenticated-student', progress_percentage: 100 },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(generateCertificate('owned-enrollment', 'authenticated-student')).rejects.toBeInstanceOf(
      CertificateNotAvailableError,
    );

    expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'enrollments');
    expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'certificates');
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });
});
