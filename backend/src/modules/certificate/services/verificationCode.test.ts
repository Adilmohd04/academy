import {
  VERIFICATION_CODE_BITS,
  VERIFICATION_CODE_FORMAT_REGEX,
  generateVerificationCode,
  verificationUrlForCode,
} from './verificationCode';

describe('certificate verification codes', () => {
  it('creates an opaque 60-bit code in the public format', () => {
    const code = generateVerificationCode();

    expect(VERIFICATION_CODE_BITS).toBeGreaterThanOrEqual(60);
    expect(code).toMatch(VERIFICATION_CODE_FORMAT_REGEX);
  });

  it('uses the one canonical public verification URL', () => {
    const original = process.env.VERIFICATION_PORTAL_URL;
    process.env.VERIFICATION_PORTAL_URL = 'https://academy.example/verify/';

    try {
      expect(verificationUrlForCode('ABCD-EFGH-JKLM')).toBe(
        'https://academy.example/verify/ABCD-EFGH-JKLM',
      );
    } finally {
      if (original === undefined) {
        delete process.env.VERIFICATION_PORTAL_URL;
      } else {
        process.env.VERIFICATION_PORTAL_URL = original;
      }
    }
  });

  it('normalizes a public application origin to the verification route', () => {
    const original = process.env.VERIFICATION_PORTAL_URL;
    process.env.VERIFICATION_PORTAL_URL = 'https://academy.example/app/';

    try {
      expect(verificationUrlForCode('ABCD-EFGH-JKLM')).toBe(
        'https://academy.example/app/verify/ABCD-EFGH-JKLM',
      );
    } finally {
      if (original === undefined) {
        delete process.env.VERIFICATION_PORTAL_URL;
      } else {
        process.env.VERIFICATION_PORTAL_URL = original;
      }
    }
  });

  it('rejects verification portal URLs that could produce unsafe public links', () => {
    const original = process.env.VERIFICATION_PORTAL_URL;
    process.env.VERIFICATION_PORTAL_URL = 'https://academy.example/verify?unexpected=value';

    try {
      expect(() => verificationUrlForCode('ABCD-EFGH-JKLM')).toThrow(
        'VERIFICATION_PORTAL_URL must not contain credentials, a query string, or a fragment',
      );
    } finally {
      if (original === undefined) {
        delete process.env.VERIFICATION_PORTAL_URL;
      } else {
        process.env.VERIFICATION_PORTAL_URL = original;
      }
    }
  });

  it('refuses malformed values rather than emitting a guessable URL', () => {
    expect(() => verificationUrlForCode('not-a-certificate-code')).toThrow(
      'Cannot create a verification URL for an invalid verification code',
    );
  });
});
