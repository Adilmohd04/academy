// Module: Certificate Services
// Location: backend/src/modules/certificate/services/

// Legacy service surface (existing routes call these directly).
export {
  calculateFinalScore,
  isEligibleForCertificate,
  awardCertificate,
  revokeCertificate,
  getStudentCertificate,
  getCourseCertificates,
  getStudentCertificates,
  checkAndAwardCertificate,
} from './certificateService';

// New services for the Certificate Designer Studio + Lifecycle System
// Spec: .kiro/specs/certificate-designer-studio/, design §6, §8.
export {
  isEligibleForCertificateDetailed,
  type EligibilityResult,
} from './eligibilityService';

export {
  issueCertificate,
  reissueRevokedCertificate,
  regenerateCertificateVerification,
  type IssueOptions,
  type IssueResult,
  type ReissueCertificateResult,
  type RegenerateVerificationResult,
  checkAndAwardCertificate as issueIfEligible,
} from './issuanceService';

export {
  resolveTemplate,
  type ResolvedTemplate,
} from './templateResolutionService';

export {
  generateVerificationCode,
  VERIFICATION_CODE_BITS,
  VERIFICATION_CODE_FORMAT_REGEX,
} from './verificationCode';

// PDF rendering
export { CertificatePdfService } from './certificatePdfService';
