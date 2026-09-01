/**
 * Public surface of the certificate template types module.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §4.
 */

export type {
  ApprovalStatus,
  ApprovalState,
  Alignment,
  AllowedFont,
  CanvasSize,
  CertificateField,
  CertificateIDField,
  CertificateRenderData,
  CertificateTemplate,
  CertificateTitleField,
  CompletionDateField,
  CourseTitleField,
  CourseIdField,
  CustomTextField,
  FieldType,
  FontWeight,
  GradeField,
  GridConfig,
  InstructorNameField,
  IssueDateField,
  OrganizationNameField,
  QRCodeField,
  StudentNameField,
  TemplateScope,
  VerificationCodeField,
  BaseField,
} from './template';

export { ALLOWED_FONTS, SCHEMA_VERSION } from './template';

export {
  templateReadSchema,
  templateWriteSchema,
  fieldReadSchema,
  fieldWriteSchema,
  KNOWN_FIELD_TYPES,
  isKnownFieldType,
  allowedFonts,
} from './schema';

export type { ParsedTemplate } from './serde';

export {
  serialize,
  parse,
  pointerFromPath,
  isCertificateTemplate,
} from './serde';

export { TemplateParseError } from './errors';
