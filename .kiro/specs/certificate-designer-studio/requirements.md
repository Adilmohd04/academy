# Requirements Document

## Introduction

The Certificate Designer Studio & Certificate Lifecycle System replaces the existing basic certificate scaffolding with a comprehensive end-to-end solution covering: a visual drag-and-drop designer for admins and teachers, dynamic data-bound fields, global and course-level templates, a teacher-edit approval workflow, eligibility-gated issuance, a student certificate center, durable storage, and a public verification portal with QR codes.

This feature builds on the existing `certificates` and `certificate_templates` tables defined in `backend/database/migrations/certificate_system.sql`, the certificate services in `backend/src/modules/certificate/services/` and `backend/src/modules/shared/services/certificateService.ts`, the existing `CertificateTemplateDesigner` component, and the student certificates page. It fixes current bugs (text/field rendering, preview-vs-output drift, save fidelity) and extends the system to meet the full ten-subsystem scope described below.

## Glossary

- **Certificate_Designer**: The visual editor (admin and teacher) used to compose certificate templates.
- **Certificate_Canvas**: The fixed-aspect-ratio drawing surface inside the Certificate_Designer where fields and the background image are positioned.
- **Dynamic_Field**: A placeable element on the Certificate_Canvas whose value is bound to runtime certificate data (e.g., student name, course title) or to user-provided custom text.
- **Custom_Text_Field**: A Dynamic_Field whose content is static text authored by the template designer rather than data-bound.
- **Template_Engine**: The backend subsystem that persists and retrieves Certificate_Template records.
- **Certificate_Template**: A persisted design (background, fields, positions, styles, and metadata) used to render certificates.
- **Global_Template**: A Certificate_Template with no `course_id` association, applicable platform-wide.
- **Default_Global_Template**: The single Global_Template marked `is_default = true` that applies when a course has no course-level template.
- **Course_Template**: A Certificate_Template scoped to one course via `course_id`.
- **Teacher_Editing_Toggle**: A per-template flag, controlled only by admins, that determines whether a teacher may modify the template.
- **Pending_Edit**: A teacher-submitted draft revision of a Certificate_Template awaiting admin review.
- **Approval_Queue**: The admin-facing list of all Pending_Edit items.
- **Certificate_Renderer**: The shared rendering pipeline that produces both the live preview and the final issued PDF/PNG from a Certificate_Template plus runtime data.
- **Issuance_Engine**: The backend subsystem that decides whether a student is eligible for a certificate and creates a Certificate record.
- **Eligibility_Conditions**: The combined set of completion, grading, and policy rules a student must satisfy before a certificate is issued.
- **Certificate**: An issued, persisted record linking a student, a course, a Certificate_Template snapshot, an immutable Certificate_ID, a Verification_Code, and a QR_Code.
- **Certificate_ID**: A globally unique, human-readable identifier for an issued Certificate (e.g., `CERT-2026-A1B2C3`).
- **Verification_Code**: A short, separate, human-shareable code used to look up a Certificate via the Verification_Portal.
- **QR_Code**: A QR image embedded in the certificate that resolves to the Verification_Portal URL for that Certificate.
- **Verification_Portal**: The public, unauthenticated web page that displays a Certificate's authenticity status given a Verification_Code or scanned QR_Code.
- **Student_Certificate_Center**: The authenticated student-facing page (`/student/certificates`) listing earned Certificates.
- **Admin**: A user with platform `role = 'admin'`.
- **Teacher**: A user with platform `role = 'teacher'`.
- **Student**: A user with platform `role = 'student'`.

## Existing Schema Baseline

The following columns and tables already exist in the codebase (per `backend/database/migrations/certificate_system.sql` and current services). Requirements reference these where applicable; the design phase will determine which additions are required.

**Already present:**
- `certificates` table: `id`, `course_id`, `student_id`, `certificate_number`, `certificate_url`, `final_score`, `grade_breakdown`, `status`, `issued_at`, `issued_by`, `revoked_at`, `revoked_by`, `revoke_reason`, `created_at`, with `UNIQUE(course_id, student_id)`.
- `certificate_templates` table: `id`, `course_id` (nullable, supports global), `template_name`, `template_data` (JSONB), `is_default`, `created_at`, `updated_at`.
- `courses` columns: `quiz_weight`, `assignment_weight`, `final_exam_weight`, `passing_score`, `enable_certificates`.
- DB functions: `generate_certificate_number()`, `calculate_student_final_score()`, `auto_award_certificate()` (trigger function, currently not wired).

**Referenced by code but NOT in the migration (must be added or reconciled in design):**
- `certificates`: `verification_code`, `qr_code_url`, `pdf_url`, `completion_date`, `is_manual_override`, `override_by`, `override_reason`, `verification_count`, `last_verified_at`.
- `certificate_verification_log` table (referenced in `shared/services/certificateService.ts` for verification audit logging).
- `certificate_templates.template_html` and structured approval metadata (currently only encoded inside `template_data` JSON).

**Likely additions needed for this feature (to be confirmed in design):**
- A revision table or pair-of-rows pattern (`certificate_template_revisions`) to support side-by-side previous-vs-updated comparison during admin approval.
- A persisted snapshot of the rendered template per issued Certificate, so a re-edited template never alters historical certificates.
- Field-level position/style schema in `template_data` covering all dynamic fields listed in Requirement 2 (current `placeholders` only covers six keys).

## Requirements

### Requirement 1: Advanced Certificate Designer Canvas

**User Story:** As an admin or teacher, I want a visual drag-and-drop certificate builder with live preview, so that I can design certificates without writing code.

#### Acceptance Criteria

1. WHEN an admin opens the Certificate_Designer at the platform level, THE Certificate_Designer SHALL render a fixed-aspect Certificate_Canvas with a configurable background image area.
2. WHEN a teacher opens the Certificate_Designer from a course they own, THE Certificate_Designer SHALL render the same Certificate_Canvas as admins receive.
3. WHEN a designer uploads a background image file of type PNG, JPG, or WEBP up to 10 MB, THE Certificate_Designer SHALL accept the upload and display the image as the Certificate_Canvas background within 3 seconds on a 50 Mbps connection.
4. IF a designer uploads a background file of an unsupported type or larger than 10 MB, THEN THE Certificate_Designer SHALL reject the file and display an error identifying the violated rule.
5. WHEN a designer selects a Dynamic_Field on the Certificate_Canvas, THE Certificate_Designer SHALL allow the designer to drag the field with the mouse and update its position in real time at a minimum of 30 frames per second on a baseline machine (Chromium, 4-core CPU, 8 GB RAM).
6. WHEN a designer drags a Dynamic_Field, THE Certificate_Designer SHALL display a live preview reflecting the new position before the drag is released.
7. WHEN a designer resizes a Dynamic_Field via its resize handles, THE Certificate_Designer SHALL update the field's width and height on the Certificate_Canvas in real time.
8. WHERE the "Show Grid" option is enabled, THE Certificate_Designer SHALL render a grid overlay on the Certificate_Canvas using the configured grid size in pixels.
9. WHERE the "Snap to Grid" option is enabled, THE Certificate_Designer SHALL round each Dynamic_Field's `x` and `y` coordinates to the nearest grid increment when the field is moved or nudged.
10. WHEN a Dynamic_Field's center is within 8 pixels of the Certificate_Canvas horizontal or vertical center, THE Certificate_Designer SHALL display a center alignment guide along the corresponding axis.
11. WHEN a designer presses an arrow key with a Dynamic_Field selected, THE Certificate_Designer SHALL nudge the field by one grid increment (or 1 pixel when grid snapping is disabled) in the corresponding direction.
12. WHEN any change is made to the design (position, size, style, content, or background), THE Certificate_Designer SHALL update the live preview within 100 milliseconds of the change.

### Requirement 2: Dynamic Certificate Fields

**User Story:** As a designer, I want to place data-bound fields anywhere on the canvas with full styling control, so that the certificate accurately reflects student and course information.

#### Acceptance Criteria

1. THE Certificate_Designer SHALL provide the following Dynamic_Field types: Student Name, Course Title, Certificate Title, Completion Date, Issue Date, Instructor Name, Organization Name, Certificate ID, Verification Code, QR Code, Grade or Score, and Custom Text Field.
2. WHEN a designer adds a Dynamic_Field to the Certificate_Canvas, THE Certificate_Designer SHALL persist its `x`, `y`, `width`, and `height` in the template definition.
3. WHEN a designer edits a Dynamic_Field's font family from the available font list, THE Certificate_Designer SHALL update the field's rendered font family in the live preview and persist the selection.
4. WHEN a designer edits a Dynamic_Field's font size, THE Certificate_Designer SHALL accept any integer between 8 and 200 inclusive and reject values outside this range with an inline error.
5. WHEN a designer edits a Dynamic_Field's font weight, THE Certificate_Designer SHALL accept the values 300, 400, 500, 600, 700, 800, and 900.
6. WHEN a designer edits a Dynamic_Field's color, THE Certificate_Designer SHALL accept any valid CSS hex color (#RRGGBB or #RRGGBBAA) and update the rendered color.
7. WHEN a designer sets a Dynamic_Field's text alignment to left, center, right, or justify, THE Certificate_Designer SHALL render the field's contents with that alignment.
8. WHEN a designer toggles a Dynamic_Field's visibility off, THE Certificate_Designer SHALL exclude that field from the live preview AND from the rendered certificate output.
9. WHERE a Dynamic_Field type is Custom Text Field, THE Certificate_Designer SHALL allow the designer to enter up to 500 characters of static text and store this text with the field.
10. WHERE a Dynamic_Field type is QR Code, THE Certificate_Designer SHALL render a placeholder QR image in the live preview and SHALL render the actual QR_Code resolving to the Verification_Portal URL in the issued certificate.
11. WHERE a Dynamic_Field type is Grade or Score, AND the source course has `enable_certificates = true` and a numeric `final_score`, THE Certificate_Renderer SHALL substitute the student's `final_score` formatted to one decimal place followed by `%`.
12. WHEN the Certificate_Renderer encounters a Dynamic_Field whose runtime value is null or empty, THE Certificate_Renderer SHALL render the field as empty (no placeholder text) without breaking the layout.

### Requirement 3: Global Certificate Templates

**User Story:** As an admin, I want to define platform-wide certificate templates and pick a default, so that every course without a custom template still issues a branded certificate.

#### Acceptance Criteria

1. THE Template_Engine SHALL allow an Admin to create, edit, and delete Global_Templates (Certificate_Template records with `course_id IS NULL`).
2. WHEN an Admin saves a Global_Template, THE Template_Engine SHALL persist the layout, background image, all Dynamic_Field positions, sizes, fonts, weights, colors, alignments, visibility flags, and any embedded QR or verification field configuration.
3. THE Template_Engine SHALL allow an Admin to mark exactly one Global_Template as the Default_Global_Template at any time.
4. WHEN an Admin marks a Global_Template as default, THE Template_Engine SHALL automatically clear `is_default` from any previously-default Global_Template.
5. WHEN a Certificate is issued for a course that has no approved Course_Template, THE Issuance_Engine SHALL render the Certificate using the current Default_Global_Template.
6. WHEN the Certificate_Renderer renders any Certificate using a Global_Template, THE Certificate_Renderer SHALL substitute the actual course title, student name, completion date, and other Dynamic_Field values from the issuing course and student.
7. WHERE multiple Global_Templates exist, THE Template_Engine SHALL list all of them in the Admin's template library with their `is_default` status visible.
8. IF a non-Admin attempts to create or modify a Global_Template, THEN THE Template_Engine SHALL return HTTP 403 and SHALL NOT modify any data.

### Requirement 4: Course-Level Certificate Templates

**User Story:** As an admin or teacher, I want to design a certificate specific to a single course, so that I can apply course-specific branding without affecting other courses.

#### Acceptance Criteria

1. THE Template_Engine SHALL allow an Admin to create, edit, and delete Course_Templates for any course.
2. THE Template_Engine SHALL allow a Teacher to create or edit a Course_Template only for courses where the Teacher is the owner (`courses.teacher_id` matches the Teacher's profile id) AND the Teacher_Editing_Toggle for that template is `true`.
3. WHEN a Course_Template exists and is in the `approved` state for a course, THE Issuance_Engine SHALL use that Course_Template instead of the Default_Global_Template when issuing certificates for that course.
4. WHEN an Admin or Teacher edits a Course_Template, THE Template_Engine SHALL NOT modify any Global_Template or any other course's Course_Template.
5. IF a Teacher attempts to read or modify a Course_Template for a course they do not own, THEN THE Template_Engine SHALL return HTTP 403 and SHALL NOT return template data.
6. WHEN a Course_Template is deleted, THE Issuance_Engine SHALL fall back to the Default_Global_Template for subsequent certificate issuances in that course.
7. WHEN a previously-issued Certificate references a now-deleted or modified template, THE Certificate_Renderer SHALL continue to render that historical Certificate exactly as originally issued by using the per-Certificate template snapshot.

### Requirement 5: Teacher Visibility and Editing Workflow

**User Story:** As an admin, I want to control whether teachers can edit their own course's certificate, and as a teacher I want to see only the templates relevant to my courses.

#### Acceptance Criteria

1. THE Template_Engine SHALL expose a per-Certificate_Template Teacher_Editing_Toggle that only an Admin can set.
2. WHEN a Teacher fetches the certificate template list, THE Template_Engine SHALL return only Course_Templates whose `course_id` corresponds to a course the Teacher owns.
3. THE Template_Engine SHALL NOT return Global_Templates, other teachers' Course_Templates, or any unapproved templates to a Teacher.
4. IF the Teacher_Editing_Toggle for a Course_Template is `false`, THEN THE Certificate_Designer SHALL display the template in read-only mode for the Teacher and SHALL disable all save and submit actions.
5. WHEN a Teacher modifies an editable Course_Template and clicks "Submit for Approval", THE Template_Engine SHALL create or update a Pending_Edit record and SHALL set the template's `approval_status` to `pending_approval`.
6. WHILE a Course_Template's `approval_status` is `pending_approval`, THE Issuance_Engine SHALL continue to use the previously approved version (or the Default_Global_Template if no approved version exists) for new certificate issuances.
7. THE Certificate_Designer SHALL provide Teachers with the same canvas, drag-and-drop, alignment, grid, and Dynamic_Field tools that Admins receive when editing is permitted.

### Requirement 6: Admin Approval Workflow

**User Story:** As an admin, I want to review pending teacher edits side-by-side with the previous version, so that I can approve or reject changes with feedback.

#### Acceptance Criteria

1. THE Template_Engine SHALL expose an Approval_Queue endpoint that returns all Course_Templates with `approval_status = 'pending_approval'`.
2. WHEN an Admin opens a Pending_Edit, THE Certificate_Designer SHALL render the previous approved version and the submitted version on the same screen with a visible diff or side-by-side preview.
3. WHEN an Admin approves a Pending_Edit, THE Template_Engine SHALL set `approval_status` to `approved`, record `approved_by` and `approved_at`, AND make the new version the active template for that course's future issuances.
4. WHEN an Admin rejects a Pending_Edit, THE Template_Engine SHALL accept a free-text rejection reason of up to 1000 characters AND SHALL set `approval_status` to `rejected` AND SHALL store the reason on the template record.
5. WHEN an Admin rejects a Pending_Edit, THE Issuance_Engine SHALL continue to use the previously approved version (if any) AND SHALL NOT use the rejected version for any new issuance.
6. WHEN a Teacher views a rejected template, THE Certificate_Designer SHALL display the rejection reason and SHALL allow the Teacher to edit and resubmit.
7. IF a non-Admin attempts to call any approval endpoint, THEN THE Template_Engine SHALL return HTTP 403.

### Requirement 7: Template Save Fidelity and Bug Fixes

**User Story:** As a designer, I want my saved templates to reload exactly as I designed them, and the live preview to match the issued certificate, so that I can trust the tool.

#### Acceptance Criteria

1. WHEN a designer saves a Certificate_Template, THE Template_Engine SHALL persist every visible attribute of every Dynamic_Field including type, x, y, width, height, font family, font size, font weight, color, alignment, visibility, custom text content, and any QR or verification configuration.
2. WHEN a previously-saved Certificate_Template is reloaded, THE Certificate_Designer SHALL render every Dynamic_Field at the exact persisted x, y, width, height, font family, font size, font weight, color, and alignment.
3. WHEN a Dynamic_Field has been added to a template and saved, THE Certificate_Designer SHALL render that field on subsequent reloads (regression: previously some text and dynamic fields were not visible after save).
4. WHEN a designer toggles a Dynamic_Field's visibility off and saves, THE Template_Engine SHALL persist the visibility flag AND THE Certificate_Designer SHALL respect it on reload.
5. THE Certificate_Renderer used by the live preview SHALL be the same code path used to produce the issued certificate output, so that the preview is pixel-equivalent to the issued certificate at the same render scale.
6. FOR ALL Certificate_Templates, rendering the template to PDF and parsing back the field positions SHALL produce coordinates within ±2 pixels of the saved coordinates (round-trip property).
7. IF the Template_Engine fails to persist any field of a save request, THEN THE Template_Engine SHALL return HTTP 500 with a descriptive error AND SHALL NOT silently drop the failing field.

### Requirement 8: Certificate Issuance Eligibility

**User Story:** As a platform owner, I want certificates issued only to students who have genuinely completed the course requirements, so that certificates remain meaningful.

#### Acceptance Criteria

1. THE Issuance_Engine SHALL issue a Certificate to a Student for a Course only when ALL of the following conditions are simultaneously true:
   - the Course's `enable_certificates` flag is `true`,
   - the Student has completed every required content item in the Course,
   - the Course's enrollment record for the Student is in a `Completed` state,
   - every required quiz, assignment, and final exam has a passing submission according to the Course's `passing_score`,
   - the weighted final score computed by `calculate_student_final_score` meets or exceeds the Course's `passing_score`,
   - no Eligibility_Conditions defined on the Course (e.g., minimum live attendance) are unmet.
2. IF any of the conditions in 8.1 is unmet, THEN THE Issuance_Engine SHALL NOT create a Certificate AND SHALL return a structured response identifying the unmet condition.
3. WHEN the Issuance_Engine creates a Certificate, THE Issuance_Engine SHALL assign a unique Certificate_ID via `generate_certificate_number()` and a unique Verification_Code.
4. WHEN the Issuance_Engine creates a Certificate, THE Issuance_Engine SHALL store the resolved template snapshot, the rendered PDF URL, the QR_Code data URL, the `final_score`, the `grade_breakdown`, the `completion_date`, and `issued_at`.
5. WHEN a Student becomes eligible for a Certificate (e.g., upon submitting the final exam), THE Issuance_Engine SHALL automatically issue the Certificate within 60 seconds of eligibility.
6. WHEN an Admin or Teacher manually issues a Certificate via the override path, THE Issuance_Engine SHALL record `is_manual_override = true`, `override_by = <user_id>`, and `override_reason` AND SHALL still produce all the artifacts described in 8.4.
7. THE Issuance_Engine SHALL enforce the existing `UNIQUE(course_id, student_id)` constraint and SHALL NOT issue a second active Certificate to the same Student for the same Course.

### Requirement 9: Student Certificate Center

**User Story:** As a student, I want a single page that lists every certificate I have earned, so that I can view, download, and share them.

#### Acceptance Criteria

1. WHEN an authenticated Student opens `/student/certificates`, THE Student_Certificate_Center SHALL display every Certificate where `student_id` matches the Student and `status = 'awarded'` (or equivalent active status).
2. THE Student_Certificate_Center SHALL display, for each Certificate: course name, completion date, Certificate_ID, current verification status, and the issuing instructor.
3. WHEN a Student clicks "View" on a Certificate, THE Student_Certificate_Center SHALL render the certificate's PDF in an in-page viewer.
4. WHEN a Student clicks "Download PDF" on a Certificate, THE Student_Certificate_Center SHALL deliver the persisted PDF identified by `certificates.pdf_url` (or generate it on demand if the URL is empty) without re-running eligibility checks.
5. WHEN a Student clicks "Share", THE Student_Certificate_Center SHALL provide a copyable public Verification_Portal URL containing the Certificate's Verification_Code AND SHALL provide native share targets where supported (Web Share API).
6. IF a Student has zero earned Certificates, THEN THE Student_Certificate_Center SHALL display an empty-state message and a link to the course catalog.
7. THE Student_Certificate_Center SHALL NOT expose any other student's Certificates to the current Student.

### Requirement 10: Certificate Storage and Persistence

**User Story:** As a student or admin, I want certificates to remain accessible permanently after course completion, so that they can be retrieved at any future date.

#### Acceptance Criteria

1. THE Issuance_Engine SHALL store every issued Certificate as a row in the `certificates` table linked to both the `student_id` and the `course_id`.
2. THE Issuance_Engine SHALL persist the rendered PDF to durable storage (Supabase storage `certificates` bucket) and SHALL store the resulting public URL on `certificates.pdf_url`.
3. WHEN a course is archived or unpublished, THE Student_Certificate_Center SHALL CONTINUE to display and serve the Student's Certificates for that course.
4. WHEN a Student account remains active, THE Student_Certificate_Center SHALL CONTINUE to serve the Student's Certificates regardless of course-level changes (template edits, course deletion).
5. IF a Course is deleted, THEN THE system SHALL preserve the historical Certificate records (status set to `archived` or equivalent) AND the rendered PDFs SHALL remain downloadable.
6. THE Certificate_Renderer SHALL store a per-Certificate template snapshot so that future template edits do not retroactively change the visual content of a previously issued Certificate.

### Requirement 11: Public Verification System

**User Story:** As an external party (employer, registrar), I want to verify a certificate's authenticity by entering its code or scanning its QR, so that I can trust the credential.

#### Acceptance Criteria

1. THE Verification_Portal SHALL accept a Verification_Code via URL path or form input WITHOUT requiring authentication.
2. WHEN a valid Verification_Code is submitted, THE Verification_Portal SHALL display the Student name, course name, completion date, Certificate_ID, and current Certificate status (one of: `valid`, `revoked`, `expired`, `invalid`).
3. WHEN a Verification_Code does not match any Certificate, THE Verification_Portal SHALL display the `invalid` status with a clear human-readable message AND SHALL log the attempt in the certificate verification log with `verification_result = 'invalid'`.
4. WHEN any verification attempt occurs, THE Verification_Portal SHALL increment the Certificate's `verification_count` (when matched) AND SHALL record the verifier's IP address and user-agent string in the verification log.
5. WHEN a Certificate has `status = 'revoked'`, THE Verification_Portal SHALL display the revoked status, the revocation date, and the revocation reason if present.
6. WHEN a QR_Code on an issued Certificate is scanned, THE Verification_Portal SHALL resolve the embedded URL and display the Certificate's verification page within 1 second on a 50 Mbps connection.
7. THE Verification_Portal SHALL NOT expose the Student's email address, internal IDs (other than the Certificate_ID), final score breakdown, or any other Student-private data.
8. THE Verification_Portal SHALL rate-limit verification requests to 60 requests per IP per minute to mitigate enumeration attacks.

### Requirement 12: Preview-Output Fidelity (Non-Functional)

**User Story:** As a designer, I want the on-screen preview to match the generated certificate exactly, so that what I see is what students get.

#### Acceptance Criteria

1. FOR ALL Certificate_Templates, the live preview rendered by the Certificate_Designer SHALL match the corresponding rendered PDF page when sampled at the same DPI, with no Dynamic_Field offset exceeding 2 pixels horizontally or vertically.
2. FOR ALL Certificate_Templates, every Dynamic_Field that is visible in the preview SHALL be present in the rendered PDF AND every Dynamic_Field hidden in the preview SHALL be absent from the rendered PDF.
3. THE Certificate_Renderer SHALL use the same font assets (web fonts and PDF-embedded fonts) for both preview and PDF rendering paths.
4. WHEN the Certificate_Designer renders a sample preview using mock data, THE Certificate_Designer SHALL apply the same Dynamic_Field substitution rules used by the Issuance_Engine.

### Requirement 13: Performance and Scale (Non-Functional)

**User Story:** As a platform operator, I want certificate features to remain responsive at platform scale, so that batch issuance and verification do not degrade the system.

#### Acceptance Criteria

1. WHEN a Student opens the Student_Certificate_Center holding up to 50 Certificates, THE Student_Certificate_Center SHALL render the list within 2 seconds end-to-end at the 95th percentile on a 50 Mbps connection.
2. WHEN the Issuance_Engine processes a batch of 1000 eligibility checks, THE Issuance_Engine SHALL complete within 5 minutes without exceeding 80% CPU on the backend service.
3. WHEN the Verification_Portal receives 100 verification requests per second, THE Verification_Portal SHALL respond with HTTP 200 (or 404 for unknown codes) within 500 milliseconds at the 95th percentile.
4. THE Template_Engine SHALL paginate the Approval_Queue at 25 items per page when more than 25 Pending_Edits exist.

### Requirement 14: Security and Integrity (Non-Functional)

**User Story:** As a platform owner, I want verification codes and IDs to be unforgeable and authorization to be strictly enforced, so that certificates cannot be spoofed.

#### Acceptance Criteria

1. THE Issuance_Engine SHALL generate Verification_Codes with at least 60 bits of entropy from a cryptographic random source.
2. THE Issuance_Engine SHALL retry on any Verification_Code or Certificate_ID collision until a unique value is produced and SHALL NOT issue two Certificates with the same Verification_Code or Certificate_ID.
3. THE Template_Engine SHALL enforce role-based access on every read and write endpoint: only Admins may modify Global_Templates and approval status, and Teachers may only access their own course templates.
4. WHEN a Certificate is revoked, THE Issuance_Engine SHALL set `status = 'revoked'`, record `revoked_at` and `revoked_by`, AND THE Verification_Portal SHALL surface the revoked status on the next verification.
5. THE Verification_Portal SHALL serve all responses over HTTPS and SHALL set a `Cache-Control: no-store` header on verification responses.
6. THE Issuance_Engine SHALL sanitize all user-provided Custom_Text_Field content before embedding it in HTML or PDF output to prevent injection attacks.

### Requirement 15: Designer Accessibility (Non-Functional)

**User Story:** As a designer using assistive technology, I want the Certificate_Designer to be operable via keyboard and screen reader, so that I can build templates without a mouse.

#### Acceptance Criteria

1. THE Certificate_Designer SHALL allow every action available via mouse (select, move, resize, change properties, save, submit) to also be performed via keyboard.
2. WHEN a Dynamic_Field is selected, THE Certificate_Designer SHALL announce the field type, position, and dimensions to assistive technology via ARIA live region updates.
3. THE Certificate_Designer SHALL maintain a logical tab order that traverses the template list, the canvas tools, the field inspector, and the action buttons in that order.
4. THE Certificate_Designer SHALL provide visible focus indicators on every interactive control with a contrast ratio of at least 3:1 against the surrounding background.
5. THE Certificate_Designer SHALL meet WCAG 2.1 Level AA contrast requirements for all UI chrome (toolbars, panels, buttons), excluding the user-authored certificate content itself which is the designer's responsibility.

### Requirement 16: Parser and Template Round-Trip Integrity

**User Story:** As a platform operator, I want the JSON template format to round-trip cleanly through serialize/parse, so that no design data is silently corrupted.

#### Acceptance Criteria

1. THE Template_Engine SHALL serialize a Certificate_Template's in-memory representation to a deterministic JSON form for storage.
2. THE Template_Engine SHALL parse a stored JSON template back into an in-memory representation that round-trips: `parse(serialize(template)) === template` for all valid templates.
3. WHEN the Template_Engine encounters a malformed template JSON during parse, THE Template_Engine SHALL return a structured error identifying the offending field path AND SHALL NOT crash the calling endpoint.
4. WHEN a new Dynamic_Field type is added in a future release, THE Template_Engine SHALL parse older templates that lack the new field without error, treating missing fields as absent rather than malformed.
