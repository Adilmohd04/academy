/**
 * FieldInspector — right-hand panel showing the selected field's properties.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 2.3–2.8, design §7.1.
 *
 * One section per editable property, each wired to the corresponding store
 * action. Inline validation errors come from `../validators/fieldValidators`.
 *
 * When no field is selected, this renders an empty-state hint pointing at
 * the toolbar's "Add field" menu.
 */

import React, { useMemo } from 'react';
import {
  selectSelectedField,
  useDesignerStore,
} from '../store/designerStore';
import {
  validateColor,
  validateCustomText,
  validateFontSize,
  validateFontWeight,
  CUSTOM_TEXT_MAX_LENGTH,
  isWhitelistedFont,
} from '../validators/fieldValidators';
import type {
  Alignment,
  CertificateIDField,
  CertificateTitleField,
  CompletionDateField,
  CourseIdField,
  CustomTextField,
  FontWeight,
  IssueDateField,
  QRCodeField,
  VerificationCodeField,
} from '../types/template';
import { FONT_PICKER_OPTIONS } from '../render/fonts';

const FONT_WEIGHTS: FontWeight[] = [300, 400, 500, 600, 700, 800, 900];
const ALIGN_OPTIONS: { value: Alignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];
const DATE_FORMATS = [
  { value: 'PPP', label: 'April 24, 2026' },
  { value: 'PP', label: 'Apr 24, 2026' },
  { value: 'MM/dd/yyyy', label: '04/24/2026' },
  { value: 'yyyy-MM-dd', label: '2026-04-24' },
];
const QR_ERROR_LEVELS: Array<'L' | 'M' | 'Q' | 'H'> = ['L', 'M', 'Q', 'H'];
const QUICK_COLORS = ['#0f172a', '#1f2937', '#334155', '#0f766e', '#1d4ed8', '#7c2d12', '#7e22ce'];

export function FieldInspector() {
  const field = useDesignerStore(selectSelectedField);
  const updateField = useDesignerStore((s) => s.updateField);
  const removeField = useDesignerStore((s) => s.removeField);
  const toggleVisibility = useDesignerStore((s) => s.toggleVisibility);

  const customTextField = field?.type === 'custom_text' ? (field as CustomTextField) : null;
  const certificateTitleField = field?.type === 'certificate_title' ? (field as CertificateTitleField) : null;
  const courseIdField = field?.type === 'course_id' ? (field as CourseIdField) : null;
  const certificateIdField = field?.type === 'certificate_id' ? (field as CertificateIDField) : null;
  const verificationCodeField = field?.type === 'verification_code' ? (field as VerificationCodeField) : null;
  const completionDateField = field?.type === 'completion_date' ? (field as CompletionDateField) : null;
  const issueDateField = field?.type === 'issue_date' ? (field as IssueDateField) : null;
  const qrCodeField = field?.type === 'qr_code' ? (field as QRCodeField) : null;

  const fontSizeError = useMemo(() => {
    if (!field) return null;
    const r = validateFontSize(field.fontSize);
    if (r.valid === false) return r.message;
    return null;
  }, [field?.fontSize]);

  const colorError = useMemo(() => {
    if (!field) return null;
    const r = validateColor(field.color);
    if (r.valid === false) return r.message;
    return null;
  }, [field?.color]);

  const fontWeightError = useMemo(() => {
    if (!field) return null;
    const r = validateFontWeight(field.fontWeight);
    if (r.valid === false) return r.message;
    return null;
  }, [field?.fontWeight]);

  if (!field) {
    return (
      <aside className="p-6 border-l border-slate-200 bg-white text-sm text-slate-500">
        <p className="font-semibold text-slate-700">No field selected</p>
        <p className="mt-2 leading-relaxed">
          Click a field on the canvas to edit it, or use the <strong>Add field</strong> menu in the
          toolbar above to insert a new one.
        </p>
      </aside>
    );
  }

  return (
    <aside className="p-5 border-l border-slate-200 bg-white text-sm text-slate-700 space-y-5 overflow-y-auto">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Field</p>
          <h3 className="font-semibold text-slate-900 capitalize">{field.type.replace(/_/g, ' ')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleVisibility(field.id)}
            className={`px-2.5 py-1 rounded text-xs font-medium border ${
              field.visible
                ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
            aria-pressed={!field.visible}
          >
            {field.visible ? 'Visible' : 'Hidden'}
          </button>
          <button
            type="button"
            onClick={() => removeField(field.id)}
            className="px-2.5 py-1 rounded text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </header>

      {/* ── Custom text content ────────────────────────────────────────── */}
      {customTextField ? (
        <Section label="Text content">
          <textarea
            value={customTextField.text}
            onChange={(e) => {
              const next = e.target.value;
              const r = validateCustomText(next);
              if (r.valid) updateField(field.id, { text: next } as Partial<CustomTextField>);
            }}
            rows={3}
            maxLength={CUSTOM_TEXT_MAX_LENGTH}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            {customTextField.text.length}/{CUSTOM_TEXT_MAX_LENGTH}
          </p>
        </Section>
      ) : null}

      {certificateTitleField ? (
        <Section label="Title text">
          <input
            type="text"
            value={certificateTitleField.text ?? ''}
            onChange={(e) => updateField(field.id, { text: e.target.value } as Partial<CertificateTitleField>)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
            placeholder="Certificate of Completion and Excellence"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Use this for a large headline shown on the certificate.
          </p>
        </Section>
      ) : null}

      {/* ── Font family ────────────────────────────────────────────────── */}
      <Section label="Font family">
        <select
          value={field.fontFamily}
          onChange={(e) => updateField(field.id, { fontFamily: e.target.value })}
          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
        >
          {FONT_PICKER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {!isWhitelistedFont(field.fontFamily) ? (
          <Hint warn>This font isn&apos;t shipped for PDF rendering. PDF will fall back to system-ui.</Hint>
        ) : null}
      </Section>

      {/* ── Font size + weight ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Section label="Size">
          <input
            type="number"
            min={8}
            max={200}
            value={field.fontSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              const r = validateFontSize(next);
              if (r.valid) updateField(field.id, { fontSize: r.value });
            }}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
          />
          {fontSizeError ? <Hint error>{fontSizeError}</Hint> : null}
        </Section>

        <Section label="Weight">
          <select
            value={field.fontWeight}
            onChange={(e) => {
              const next = Number(e.target.value);
              const r = validateFontWeight(next);
              if (r.valid) updateField(field.id, { fontWeight: r.value });
            }}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
          >
            {FONT_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          {fontWeightError ? <Hint error>{fontWeightError}</Hint> : null}
        </Section>
      </div>

      {/* ── Color ──────────────────────────────────────────────────────── */}
      <Section label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={field.color.length === 7 ? field.color : '#000000'}
            onChange={(e) => updateField(field.id, { color: e.target.value })}
            className="h-9 w-12 border border-slate-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={field.color}
            onChange={(e) => {
              const next = e.target.value;
              const r = validateColor(next);
              if (r.valid) updateField(field.id, { color: r.value });
              else updateField(field.id, { color: next as string });
            }}
            className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-sm font-mono"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {QUICK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => updateField(field.id, { color })}
              className="h-6 w-6 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: color }}
              aria-label={`Set color ${color}`}
            />
          ))}
        </div>
        {colorError ? <Hint error>{colorError}</Hint> : null}
      </Section>

      {courseIdField || certificateIdField || verificationCodeField ? (
        <Section label="Prefix">
          <input
            type="text"
            value={(courseIdField?.prefix ?? certificateIdField?.prefix ?? verificationCodeField?.prefix) || ''}
            onChange={(e) => {
              const prefix = e.target.value;
              if (courseIdField) updateField(field.id, { prefix } as Partial<CourseIdField>);
              if (certificateIdField) updateField(field.id, { prefix } as Partial<CertificateIDField>);
              if (verificationCodeField) updateField(field.id, { prefix } as Partial<VerificationCodeField>);
            }}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm"
            placeholder="e.g. CERT- or Verify: "
          />
        </Section>
      ) : null}

      {completionDateField || issueDateField ? (
        <Section label="Date format">
          <select
            value={(completionDateField?.format ?? issueDateField?.format) || 'PPP'}
            onChange={(e) => {
              const format = e.target.value;
              if (completionDateField) updateField(field.id, { format } as Partial<CompletionDateField>);
              if (issueDateField) updateField(field.id, { format } as Partial<IssueDateField>);
            }}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
          >
            {DATE_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Section>
      ) : null}

      {qrCodeField ? (
        <Section label="QR settings">
          <select
            value={qrCodeField.errorCorrectionLevel ?? 'M'}
            onChange={(e) =>
              updateField(field.id, {
                errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H',
              } as Partial<QRCodeField>)
            }
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm bg-white"
          >
            {QR_ERROR_LEVELS.map((level) => (
              <option key={level} value={level}>
                Error correction {level}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Higher levels are more robust for printed certificates.
          </p>
        </Section>
      ) : null}

      {/* ── Alignment ──────────────────────────────────────────────────── */}
      <Section label="Alignment">
        <div className="flex gap-1.5">
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField(field.id, { align: opt.value })}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium border ${
                field.align === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              aria-pressed={field.align === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Position + size readout (read-only — drag the canvas to change) ─ */}
      <Section label="Position">
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <Pair label="x">{Math.round(field.x)} px</Pair>
          <Pair label="y">{Math.round(field.y)} px</Pair>
          <Pair label="w">{Math.round(field.width)} px</Pair>
          <Pair label="h">{Math.round(field.height)} px</Pair>
        </div>
      </Section>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Tiny presentational helpers
// ---------------------------------------------------------------------------

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">{label}</label>
      {children}
    </section>
  );
}

function Hint({ children, error, warn }: { children: React.ReactNode; error?: boolean; warn?: boolean }) {
  return (
    <p
      className={`mt-1 text-[11px] ${
        error ? 'text-rose-600' : warn ? 'text-amber-700' : 'text-slate-500'
      }`}
    >
      {children}
    </p>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="font-medium text-slate-400">{label}</span>
      <span className="text-slate-700">{children}</span>
    </div>
  );
}
