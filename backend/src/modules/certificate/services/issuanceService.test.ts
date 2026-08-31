import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type QueryResult = { data: any; error: any };

const queuedBuilders: Array<any> = [];
const insertedPayloads: any[] = [];

function makeBuilder(result: QueryResult): any {
  const builder: any = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn(),
    insert: jest.fn(),
    single: jest.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockResolvedValue(result);
  builder.maybeSingle.mockResolvedValue(result);
  builder.insert.mockImplementation((payload: any) => {
    insertedPayloads.push(payload);
    return builder;
  });
  builder.single.mockResolvedValue(result);
  return builder;
}

const mockSupabase = {
  from: jest.fn(() => {
    const builder = queuedBuilders.shift();
    if (!builder) throw new Error('Unexpected Supabase query');
    return builder;
  }),
  rpc: jest.fn<(...args: any[]) => Promise<any>>(),
};

const mockRenderAndStore = jest.fn<(certificateId: string) => Promise<string>>();
const mockGenerateVerificationCode = jest.fn<() => string>();
const mockVerificationUrlForCode = jest.fn<(code: string) => string>();
const mockGenerateVerificationQr = jest.fn<(url: string) => Promise<string>>();
const mockResolveIdentity = jest.fn();
const mockFindEnrollment = jest.fn();
const mockEligible = jest.fn();
const mockScore = jest.fn();

jest.mock('../../../config/database', () => ({ supabase: mockSupabase }));
jest.mock('./verificationCode', () => ({
  generateVerificationCode: mockGenerateVerificationCode,
  verificationUrlForCode: mockVerificationUrlForCode,
}));
jest.mock('./verificationQr', () => ({
  generateVerificationQrDataUrl: mockGenerateVerificationQr,
}));
jest.mock('./certificatePdfService', () => ({
  renderAndStoreCertificatePdf: mockRenderAndStore,
  removeCertificatePdfArtifacts: jest.fn(),
}));
jest.mock('./studentIdentity', () => ({
  resolveCertificateStudentIdentity: mockResolveIdentity,
  findCertificateEnrollment: mockFindEnrollment,
}));
jest.mock('./eligibilityService', () => ({
  isEligibleForCertificateDetailed: mockEligible,
}));
jest.mock('./certificateService', () => ({
  calculateFinalScore: mockScore,
}));
jest.mock('./templateResolutionService', () => ({
  resolveTemplate: jest.fn(),
}));

import { reissueRevokedCertificate } from './issuanceService';

describe('revoked certificate reissue', () => {
  beforeEach(() => {
    queuedBuilders.length = 0;
    insertedPayloads.length = 0;
    jest.clearAllMocks();
    mockSupabase.from.mockImplementation(() => {
      const builder = queuedBuilders.shift();
      if (!builder) throw new Error('Unexpected Supabase query');
      return builder;
    });
    mockSupabase.rpc.mockResolvedValue({ data: 'LMA-2026-0042', error: null });
    mockRenderAndStore.mockResolvedValue('https://storage.example/issued/replacement.pdf');
    mockGenerateVerificationCode.mockReturnValue('ABCD-EFGH-JKLM');
    mockVerificationUrlForCode.mockImplementation((code: string) => `https://academy.example/verify/${code}`);
    mockGenerateVerificationQr.mockResolvedValue('data:image/png;base64,qr');
  });

  it('creates a new QR-bearing revision from the revoked immutable snapshot without checking live learning data', async () => {
    const revoked = {
      id: '11111111-1111-4111-8111-111111111111',
      course_id: '22222222-2222-4222-8222-222222222222',
      student_id: 'user_historical_student',
      status: 'revoked',
      revision_number: 2,
      student_name: 'Historical Student',
      course_name_cached: 'Original Course Title',
      final_score: 88.5,
      percentage: 88.5,
      total_marks: 89,
      grade_breakdown: { quiz_average: 91, assignment_average: 86 },
      completion_date: '2025-02-01T00:00:00.000Z',
      issued_at: '2025-02-02T00:00:00.000Z',
      template_snapshot: { id: 'template-at-issue', fields: [] },
      is_manual_override: true,
      override_by: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      override_reason: 'Approved accommodation',
      expires_at: '2028-02-01T00:00:00.000Z',
    };
    const created = {
      ...revoked,
      id: '33333333-3333-4333-8333-333333333333',
      status: 'awarded',
      certificate_number: 'LMA-2026-0042',
      verification_code: 'ABCD-EFGH-JKLM',
    };

    queuedBuilders.push(
      makeBuilder({ data: revoked, error: null }),
      makeBuilder({ data: [revoked], error: null }),
      makeBuilder({ data: null, error: null }),
      makeBuilder({ data: created, error: null }),
    );

    const result = await reissueRevokedCertificate(revoked.id, {
      reason: 'Corrected administrative record',
      by: 'admin_123',
    });

    expect(result).toEqual({
      ok: true,
      alreadyIssued: false,
      certificate: {
        ...created,
        pdf_url: 'https://storage.example/issued/replacement.pdf',
      },
    });
    expect(insertedPayloads).toHaveLength(1);
    expect(insertedPayloads[0]).toMatchObject({
      course_id: revoked.course_id,
      student_id: revoked.student_id,
      student_name: revoked.student_name,
      course_name_cached: revoked.course_name_cached,
      final_score: revoked.final_score,
      percentage: revoked.percentage,
      total_marks: revoked.total_marks,
      grade_breakdown: revoked.grade_breakdown,
      completion_date: revoked.completion_date,
      template_snapshot: revoked.template_snapshot,
      is_manual_override: true,
      override_by: revoked.override_by,
      override_reason: revoked.override_reason,
      expires_at: revoked.expires_at,
      revision_number: 3,
      reissued_from_certificate_id: revoked.id,
      reissue_reason: 'Corrected administrative record',
      reissued_by: 'admin_123',
      certificate_number: 'LMA-2026-0042',
      verification_code: 'ABCD-EFGH-JKLM',
      qr_code_url: 'data:image/png;base64,qr',
    });
    expect(mockResolveIdentity).not.toHaveBeenCalled();
    expect(mockFindEnrollment).not.toHaveBeenCalled();
    expect(mockEligible).not.toHaveBeenCalled();
    expect(mockScore).not.toHaveBeenCalled();
    expect(mockRenderAndStore).toHaveBeenCalledWith(created.id);
  });
});
