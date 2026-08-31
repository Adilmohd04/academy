'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Grid3X3,
  ImagePlus,
  Loader2,
  Move,
  Save,
  Send,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

type Mode = 'admin' | 'teacher';
type TemplateScope = 'global' | 'course';
type DesignerTheme = 'classic' | 'modern' | 'premium';

type PlaceholderKey =
  | 'student_name'
  | 'course_name'
  | 'certificate_id'
  | 'verification_code'
  | 'issue_date'
  | 'qr_code';

interface PlaceholderConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: number;
}

interface TemplateData {
  background_image_url?: string;
  platform?: 'platform' | 'school' | 'course';
  allow_teacher_edits?: boolean;
  placeholders: Record<PlaceholderKey, PlaceholderConfig>;
  approval_status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  theme?: DesignerTheme;
}

interface CertificateTemplate {
  id: string;
  course_id: string | null;
  template_name: string;
  template_data: TemplateData;
  is_default?: boolean;
}

interface CourseOption {
  id: string;
  title: string;
}

interface Props {
  mode: Mode;
  courseId?: string;
  userId?: string | null;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 620;

const PLACEHOLDER_LABELS: Record<PlaceholderKey, string> = {
  student_name: 'Student Name',
  course_name: 'Course Name',
  certificate_id: 'Certificate ID',
  verification_code: 'Verification Code',
  issue_date: 'Issue Date',
  qr_code: 'QR Code',
};

const SAMPLE_TEXT: Record<PlaceholderKey, string> = {
  student_name: 'Student Full Name',
  course_name: 'Course Title',
  certificate_id: 'Certificate ID: CERT-2026-ABC123',
  verification_code: 'Verify: AB12-CD34-EF56',
  issue_date: 'Issued: 24 Apr 2026',
  qr_code: 'QR',
};

const DEFAULT_PLACEHOLDERS: Record<PlaceholderKey, PlaceholderConfig> = {
  student_name: { x: 320, y: 250, fontSize: 44, color: '#1f2937', fontWeight: 700 },
  course_name: { x: 300, y: 320, fontSize: 30, color: '#0f766e', fontWeight: 600 },
  certificate_id: { x: 70, y: 560, fontSize: 16, color: '#334155', fontWeight: 600 },
  verification_code: { x: 70, y: 585, fontSize: 15, color: '#475569', fontWeight: 600 },
  issue_date: { x: 720, y: 560, fontSize: 16, color: '#334155', fontWeight: 600 },
  qr_code: { x: 840, y: 500, fontSize: 18, color: '#111827', fontWeight: 600 },
};

const DEFAULT_TEMPLATE_DATA: TemplateData = {
  background_image_url: '',
  platform: 'platform',
  allow_teacher_edits: false,
  approval_status: 'draft',
  theme: 'classic',
  placeholders: DEFAULT_PLACEHOLDERS,
};

const THEME_PRESETS: Record<DesignerTheme, { label: string; backgroundClass: string; placeholderPatch: Partial<Record<PlaceholderKey, Partial<PlaceholderConfig>>> }> = {
  classic: {
    label: 'Classic',
    backgroundClass: 'bg-gradient-to-br from-amber-50 via-white to-yellow-50',
    placeholderPatch: {
      student_name: { color: '#1f2937', fontWeight: 700 },
      course_name: { color: '#0f766e', fontWeight: 600 },
      certificate_id: { color: '#334155' },
      verification_code: { color: '#475569' },
      issue_date: { color: '#334155' },
      qr_code: { color: '#0f172a' },
    },
  },
  modern: {
    label: 'Modern',
    backgroundClass: 'bg-gradient-to-br from-slate-100 via-white to-cyan-50',
    placeholderPatch: {
      student_name: { color: '#0f172a', fontWeight: 700 },
      course_name: { color: '#1d4ed8', fontWeight: 600 },
      certificate_id: { color: '#334155' },
      verification_code: { color: '#334155' },
      issue_date: { color: '#1e293b' },
      qr_code: { color: '#0f172a' },
    },
  },
  premium: {
    label: 'Premium',
    backgroundClass: 'bg-gradient-to-br from-zinc-900 via-slate-800 to-stone-900',
    placeholderPatch: {
      student_name: { color: '#f8fafc', fontWeight: 700 },
      course_name: { color: '#fde68a', fontWeight: 700 },
      certificate_id: { color: '#e2e8f0' },
      verification_code: { color: '#cbd5e1' },
      issue_date: { color: '#e2e8f0' },
      qr_code: { color: '#f8fafc' },
    },
  },
};

const PRESET_COLORS = ['#111827', '#1f2937', '#334155', '#0f766e', '#1d4ed8', '#7c2d12', '#7e22ce', '#f8fafc'];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export default function CertificateTemplateDesigner({ mode, courseId, userId }: Props) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace('localhost', '127.0.0.1');
  const { getToken } = useAuth();

  const [viewMode, setViewMode] = useState<'library' | 'editor'>('library');
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [scope, setScope] = useState<TemplateScope>(courseId ? 'course' : 'global');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  const [templateData, setTemplateData] = useState<TemplateData>(DEFAULT_TEMPLATE_DATA);
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<PlaceholderKey>('student_name');
  const [draggingKey, setDraggingKey] = useState<PlaceholderKey | null>(null);
  const [draggingOverUpload, setDraggingOverUpload] = useState(false);

  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveCourseId = useMemo(() => {
    if (mode === 'teacher') return courseId;
    return scope === 'course' ? selectedCourseId || undefined : undefined;
  }, [mode, courseId, scope, selectedCourseId]);

  const currentTheme = (templateData.theme || 'classic') as DesignerTheme;
  const currentPlatform = templateData.platform || 'platform';
  const teacherEditingLocked = mode === 'teacher' && selectedTemplateId !== '' && templateData.allow_teacher_edits !== true;
  const activeTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId) || null, [templates, selectedTemplateId]);

  const centerGuideX = CANVAS_WIDTH / 2;
  const centerGuideY = CANVAS_HEIGHT / 2;
  const selectedField = templateData.placeholders[selectedPlaceholder];
  const nearCenterX = Math.abs(selectedField.x - centerGuideX) <= 8;
  const nearCenterY = Math.abs(selectedField.y - centerGuideY) <= 8;

  useEffect(() => {
    if (!apiBase || !userId) return;
    fetchTemplates();
  }, [apiBase, userId, mode, courseId]);

  useEffect(() => {
    if (!apiBase || !userId || mode !== 'admin') return;
    fetchCourses();
  }, [apiBase, userId, mode]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingKey || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      let nextX = (event.clientX - rect.left) * scaleX;
      let nextY = (event.clientY - rect.top) * scaleY;

      if (snapToGrid) {
        nextX = Math.round(nextX / gridSize) * gridSize;
        nextY = Math.round(nextY / gridSize) * gridSize;
      }

      nextX = clamp(nextX, 0, CANVAS_WIDTH);
      nextY = clamp(nextY, 0, CANVAS_HEIGHT);

      setTemplateData((prev) => ({
        ...prev,
        placeholders: {
          ...prev.placeholders,
          [draggingKey]: {
            ...prev.placeholders[draggingKey],
            x: Math.round(nextX),
            y: Math.round(nextY),
          },
        },
      }));
    };

    const handleMouseUp = () => setDraggingKey(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingKey, snapToGrid, gridSize]);

  const fetchTemplates = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = await getToken();
      const query = mode === 'teacher' && courseId ? `?courseId=${courseId}` : '';
      const response = await fetch(`${apiBase}/api/certificate-templates${query}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        setTemplates([]);
        return;
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/courses?approval_status=approved`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      const mapped = list
        .filter((c: any) => c?.id && c?.title)
        .map((c: any) => ({ id: String(c.id), title: String(c.title) }));
      setAvailableCourses(mapped);
      if (!selectedCourseId && mapped.length > 0) {
        setSelectedCourseId(mapped[0].id);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const resetEditor = (nextScope?: TemplateScope, nextCourseId?: string) => {
    const useScope = nextScope || scope;
    const useCourse = nextCourseId ?? selectedCourseId;
    setSelectedTemplateId('');
    setTemplateData({ ...DEFAULT_TEMPLATE_DATA, placeholders: { ...DEFAULT_PLACEHOLDERS } });
    setTemplateName(useScope === 'course' ? 'Course Certificate Template' : 'Default Certificate Template');
    setSetAsDefault(useScope === 'global');
    if (mode === 'admin' && useScope !== scope) setScope(useScope);
    if (mode === 'admin' && nextCourseId !== undefined) setSelectedCourseId(useCourse);
    setViewMode('editor');
  };

  const editTemplate = (template: CertificateTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.template_name || '');
    setTemplateData({
      ...DEFAULT_TEMPLATE_DATA,
      ...(template.template_data || {}),
      placeholders: {
        ...DEFAULT_PLACEHOLDERS,
        ...(template.template_data?.placeholders || {}),
      },
    });
    setSetAsDefault(Boolean(template.is_default));

    if (mode === 'admin') {
      if (template.course_id) {
        setScope('course');
        setSelectedCourseId(template.course_id);
      } else {
        setScope('global');
      }
    }

    setViewMode('editor');
  };

  const createFromCourse = (course: CourseOption) => {
    resetEditor('course', course.id);
    setTemplateName(`${course.title} Certificate Template`);
    setMessage(`Creating course template for ${course.title}`);
  };

  const updatePlaceholder = (key: PlaceholderKey, patch: Partial<PlaceholderConfig>) => {
    setTemplateData((prev) => ({
      ...prev,
      placeholders: {
        ...prev.placeholders,
        [key]: {
          ...prev.placeholders[key],
          ...patch,
        },
      },
    }));
  };

  const onUploadImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Please upload a valid image file (PNG, JPG, WEBP, etc).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTemplateData((prev) => ({ ...prev, background_image_url: String(reader.result || '') }));
      setMessage('Background image uploaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const applyTheme = (theme: DesignerTheme) => {
    const preset = THEME_PRESETS[theme];

    setTemplateData((prev) => {
      const nextPlaceholders = { ...prev.placeholders } as Record<PlaceholderKey, PlaceholderConfig>;
      (Object.keys(nextPlaceholders) as PlaceholderKey[]).forEach((key) => {
        nextPlaceholders[key] = {
          ...nextPlaceholders[key],
          ...(preset.placeholderPatch[key] || {}),
        };
      });

      return {
        ...prev,
        theme,
        placeholders: nextPlaceholders,
      };
    });

    setMessage(`${preset.label} preset applied.`);
  };

  const nudgePlaceholder = (dx: number, dy: number) => {
    const current = templateData.placeholders[selectedPlaceholder];
    let nextX = current.x + dx;
    let nextY = current.y + dy;

    if (snapToGrid) {
      nextX = Math.round(nextX / gridSize) * gridSize;
      nextY = Math.round(nextY / gridSize) * gridSize;
    }

    updatePlaceholder(selectedPlaceholder, {
      x: clamp(nextX, 0, CANVAS_WIDTH),
      y: clamp(nextY, 0, CANVAS_HEIGHT),
    });
  };

  const alignSelected = (modeAlign: 'left' | 'top' | 'centerX' | 'centerY') => {
    const current = templateData.placeholders[selectedPlaceholder];
    if (modeAlign === 'left') updatePlaceholder(selectedPlaceholder, { x: 0 });
    if (modeAlign === 'top') updatePlaceholder(selectedPlaceholder, { y: 0 });
    if (modeAlign === 'centerX') updatePlaceholder(selectedPlaceholder, { x: CANVAS_WIDTH / 2 });
    if (modeAlign === 'centerY') updatePlaceholder(selectedPlaceholder, { y: CANVAS_HEIGHT / 2 });

    if (modeAlign === 'left' || modeAlign === 'top') {
      setMessage(`${PLACEHOLDER_LABELS[selectedPlaceholder]} aligned to ${modeAlign}.`);
    } else {
      setMessage(`${PLACEHOLDER_LABELS[selectedPlaceholder]} aligned to center.`);
    }

    if (current.x === current.y) {
      // no-op branch to keep lint happy with current usage
    }
  };

  const distributeFooterFields = () => {
    const keys: PlaceholderKey[] = ['certificate_id', 'verification_code', 'issue_date'];
    const sorted = [...keys].sort((a, b) => templateData.placeholders[a].x - templateData.placeholders[b].x);
    const minX = templateData.placeholders[sorted[0]].x;
    const maxX = templateData.placeholders[sorted[sorted.length - 1]].x;
    const step = (maxX - minX) / (sorted.length - 1 || 1);

    setTemplateData((prev) => {
      const next = { ...prev.placeholders } as Record<PlaceholderKey, PlaceholderConfig>;
      sorted.forEach((key, index) => {
        next[key] = { ...next[key], x: Math.round(minX + index * step) };
      });
      return { ...prev, placeholders: next };
    });

    setMessage('Footer fields distributed with equal spacing.');
  };

  const saveTemplate = async (submitForApproval: boolean) => {
    if (!userId) {
      setMessage('Still loading your admin session. Please try saving again in a moment.');
      return;
    }

    if (mode === 'teacher' && teacherEditingLocked) {
      setMessage('Admin has not enabled editing for this certificate template yet.');
      return;
    }

    if (mode === 'admin' && scope === 'course' && !selectedCourseId) {
      setMessage('Choose a course first for course-wise template creation.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = await getToken();
      const payload = {
        courseId: effectiveCourseId || null,
        templateName: templateName.trim(),
        templateData: {
          ...templateData,
          platform: mode === 'admin' ? currentPlatform : (templateData.platform || 'course'),
          allow_teacher_edits: mode === 'admin' ? Boolean(templateData.allow_teacher_edits) : Boolean(templateData.allow_teacher_edits),
        },
        submitForApproval: mode === 'teacher' ? true : submitForApproval,
        isDefault: mode === 'admin' ? setAsDefault : false,
      };

      const method = selectedTemplateId ? 'PATCH' : 'POST';
      const endpoint = selectedTemplateId
        ? `${apiBase}/api/certificate-templates/${selectedTemplateId}`
        : `${apiBase}/api/certificate-templates`;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || 'Failed to save template.');
        return;
      }

      setMessage(submitForApproval ? 'Template submitted for admin approval.' : 'Template saved successfully.');
      await fetchTemplates();
      setViewMode('library');
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const approveTemplate = async () => {
    if (!userId || !selectedTemplateId || mode !== 'admin') {
      if (!userId) setMessage('Still loading your admin session. Please try again in a moment.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/certificate-templates/${selectedTemplateId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isDefault: setAsDefault }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || 'Failed to approve template.');
        return;
      }

      setMessage('Template approved successfully.');
      await fetchTemplates();
      setViewMode('library');
    } catch (error) {
      console.error('Error approving template:', error);
      setMessage('Failed to approve template.');
    } finally {
      setSaving(false);
    }
  };

  const approveTemplateById = async (templateId: string) => {
    if (!userId || mode !== 'admin') {
      if (!userId) setMessage('Still loading your admin session. Please try again in a moment.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = await getToken();
      const response = await fetch(`${apiBase}/api/certificate-templates/${templateId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isDefault: false }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || 'Failed to approve template.');
        return;
      }

      setMessage('Template approved from review queue.');
      await fetchTemplates();
    } catch (error) {
      console.error('Error approving template from queue:', error);
      setMessage('Failed to approve template.');
    } finally {
      setSaving(false);
    }
  };

  const globalTemplates = templates.filter((t) => !t.course_id);
  const courseTemplates = templates.filter((t) => !!t.course_id);
  const pendingTemplates = templates.filter((t) => t.template_data?.approval_status === 'pending_approval');

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[22px] border border-[#e6e1d5] bg-gradient-to-br from-[#f8f4eb] via-white to-[#f7f3ea] p-6">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 15% 30%, rgba(31,91,75,0.08) 0, transparent 30%), radial-gradient(circle at 88% 5%, rgba(199,169,107,0.13) 0, transparent 28%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border border-[rgba(31,91,75,0.18)] bg-[rgba(31,91,75,0.08)] text-[#1f5b4b] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              {mode === 'admin' ? 'Admin certificate studio' : 'Teacher certificate studio'}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-[#1f2a24]">Certificate Designer</h1>
            <p className="text-sm text-[#6f7a72] mt-2 max-w-3xl leading-6">
              {viewMode === 'library'
                ? 'Build polished platform, school, or course-level templates with one-click setup, cleaner template management, and approval-aware workflow.'
                : 'Studio mode: drag placeholders, snap to grid, align elements, and tune visual style with precise controls.'}
            </p>
          </div>

          {viewMode === 'editor' ? (
            <IslamicButton variant="outline" onClick={() => setViewMode('library')}>
              Back To Template Library
            </IslamicButton>
          ) : null}
        </div>
      </section>

      {message && (
        <IslamicCard className="p-4 border border-[#e8d59a] bg-[#fff8e4] text-[#7a6130] text-sm">
          {message}
        </IslamicCard>
      )}

      {viewMode === 'library' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <IslamicCard className="xl:col-span-4 p-5 border border-[#e6e1d5] bg-[#fdfcf8] space-y-4">
            <h3 className="text-base font-semibold text-[#1f2a24]">Create New Certificate</h3>

            {mode === 'admin' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#4a554e] mb-1">Template Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as TemplateScope)}
                    className="w-full border border-[#d8d3c7] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="global">Global Default Certificate</option>
                    <option value="course">Course-wise Certificate</option>
                  </select>
                </div>

                {scope === 'course' && (
                  <div>
                    <label className="block text-sm font-medium text-[#4a554e] mb-1">Select Course</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full border border-[#d8d3c7] rounded-lg px-3 py-2 text-sm"
                    >
                      {availableCourses.length === 0 ? <option value="">No published courses</option> : null}
                      {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <IslamicButton variant="primary" onClick={() => resetEditor(scope, selectedCourseId)} disabled={scope === 'course' && !selectedCourseId}>
                  Start Designing
                </IslamicButton>
              </>
            ) : (
              <IslamicButton variant="primary" onClick={() => resetEditor('course', courseId)}>
                Create Course Certificate
              </IslamicButton>
            )}
          </IslamicCard>

          <IslamicCard className="xl:col-span-8 p-5 border border-[#e6e1d5] bg-white space-y-5">
            {mode === 'admin' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#e6e1d5] bg-[#f8f6ef] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#1f5b4b]">Teacher edit policy</p>
                  <p className="text-sm text-[#4a554e] mt-2 leading-6">Enable "Allow teacher editing" only for templates where teachers can customize. Any teacher update is still sent back to admin for approval before use.</p>
                </div>
                <div className="rounded-xl border border-[#e8d59a] bg-[#fff8e4] p-3">
                  <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#7a6130]">Pending review queue</p>
                  <p className="text-sm text-[#7a6130] mt-2 leading-6">
                    {pendingTemplates.length === 0
                      ? 'No pending templates right now.'
                      : `${pendingTemplates.length} template${pendingTemplates.length > 1 ? 's are' : ' is'} waiting for admin approval.`}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base font-semibold text-[#1f2a24] mb-2">Template Library</h3>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-[#6f7a72]"><Loader2 className="w-4 h-4 animate-spin" /> Loading templates...</div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-[#6f7a72]">No templates yet.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-[#e6e1d5] p-3 bg-[#fbfaf7] flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#1f2a24]">{template.template_name}</div>
                        <div className="text-xs text-[#6f7a72] mt-1 flex flex-wrap items-center gap-2">
                          <span>{template.template_data?.platform || (template.course_id ? 'course' : 'platform')}</span>
                          <span>·</span>
                          <span>{template.course_id ? 'Course-wise' : 'Global'}</span>
                          <span>·</span>
                          <span>{template.is_default ? 'Default' : 'Not default'}</span>
                          <span className={`px-2 py-0.5 rounded-full border ${template.template_data?.approval_status === 'pending_approval' ? 'bg-[#fff8e4] border-[#e8d59a] text-[#7a6130]' : 'bg-white border-[#d8d3c7] text-[#4a554e]'}`}>
                            {(template.template_data?.approval_status || 'draft').replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border ${template.template_data?.allow_teacher_edits ? 'bg-[#ecfdf5] border-[#86efac] text-[#166534]' : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155]'}`}>
                            {template.template_data?.allow_teacher_edits ? 'Teacher edits enabled' : 'Teacher edits locked'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editTemplate(template)}
                          disabled={mode === 'teacher' && template.template_data?.allow_teacher_edits !== true}
                          className="px-3 py-1.5 border border-[#d8d3c7] rounded-md text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {mode === 'teacher' && template.template_data?.allow_teacher_edits !== true ? 'Locked' : 'Edit'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {mode === 'admin' && (
              <div>
                <h4 className="text-sm font-semibold text-[#1f2a24] mb-2">One-Click Create From Course</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableCourses.slice(0, 8).map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => createFromCourse(course)}
                      className="text-left p-2.5 rounded-lg border border-[#e6e1d5] hover:bg-[#f6f2e8]"
                    >
                      <div className="font-medium text-sm text-[#1f2a24] truncate">{course.title}</div>
                      <div className="text-xs text-[#6f7a72]">Create course certificate template</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'admin' && pendingTemplates.length > 0 && (
              <div className="rounded-lg border border-[#e8d59a] bg-[#fff8e4] p-3">
                <h4 className="text-sm font-semibold text-[#7a6130] mb-2">Pending Teacher Submissions</h4>
                <div className="space-y-1.5">
                  {pendingTemplates.map((template) => (
                    <div key={`pending-${template.id}`} className="w-full text-left text-xs px-2.5 py-2 rounded border border-[#e8d59a] bg-white flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[#7a6130]">{template.template_name}</p>
                        <p className="text-[#8a7449] mt-1">{template.course_id ? 'Course-wise' : 'Global'} · {template.template_data?.platform || 'platform'} · {template.template_data?.allow_teacher_edits ? 'Teacher edits enabled' : 'Teacher edits locked'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editTemplate(template)}
                          className="px-2.5 py-1.5 rounded border border-[#d8d3c7] bg-white hover:bg-[#fff3cf]"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => approveTemplateById(template.id)}
                          disabled={saving}
                          className="px-2.5 py-1.5 rounded border border-[#86efac] bg-[#ecfdf5] text-[#166534] hover:bg-[#dcfce7] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Approve now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </IslamicCard>
        </div>
      )}

      {viewMode === 'editor' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <IslamicCard className="xl:col-span-3 p-5 border border-[#e6e1d5] bg-[#fdfcf8] space-y-4">
            <h3 className="text-base font-semibold text-[#1f2a24]">Template Setup</h3>

            {teacherEditingLocked && (
              <div className="rounded-lg border border-[#e8d59a] bg-[#fff8e4] p-3 text-xs text-[#7a6130] leading-5">
                Admin must enable editing for this template before a teacher can change it. You can review the current design, but changes are locked until permission is granted.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#4a554e] mb-1">Template Name</label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={teacherEditingLocked}
                className="w-full border border-[#d8d3c7] rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {mode === 'admin' && (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                  />
                  Make this default for all courses
                </label>

                <div>
                  <label className="block text-sm font-medium text-[#4a554e] mb-1">Platform Scope</label>
                  <select
                    value={currentPlatform}
                    onChange={(e) => setTemplateData((prev) => ({ ...prev, platform: e.target.value as TemplateData['platform'] }))}
                    className="w-full border border-[#d8d3c7] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="platform">Platform-wide</option>
                    <option value="school">School-specific</option>
                    <option value="course">Course-specific</option>
                  </select>
                </div>

                <div className="rounded-lg border border-[#e6e1d5] bg-[#f7f5ef] p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={templateData.allow_teacher_edits === true}
                      onChange={(e) => setTemplateData((prev) => ({ ...prev, allow_teacher_edits: e.target.checked }))}
                    />
                    Allow teacher editing for this template
                  </label>
                  <p className="text-[11px] leading-5 text-[#6f7a72]">
                    Admins can turn this on or off per template. When disabled, teachers can view the certificate design but cannot edit it.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[#4a554e] mb-1">Preset Theme</label>
              <select
                value={currentTheme}
                onChange={(e) => applyTheme(e.target.value as DesignerTheme)}
                className="w-full border border-[#d8d3c7] rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(THEME_PRESETS) as DesignerTheme[]).map((key) => (
                  <option key={key} value={key}>{THEME_PRESETS[key].label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a554e] mb-2">Background Image</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingOverUpload(true);
                }}
                onDragLeave={() => setDraggingOverUpload(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingOverUpload(false);
                  onUploadImage(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex flex-col items-center justify-center gap-2 border border-dashed rounded-lg p-4 cursor-pointer text-sm transition ${
                  draggingOverUpload ? 'border-teal-500 bg-teal-50' : 'border-[#d8d3c7] hover:bg-[#f6f2e8]'
                }`}
              >
                <UploadCloud className="w-5 h-5" />
                <span>Click or drop image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUploadImage(e.target.files?.[0])}
                />
              </div>

              {templateData.background_image_url && (
                <div className="mt-2 rounded-lg border border-[#e6e1d5] p-2 bg-white">
                  <img src={templateData.background_image_url} alt="Background" className="w-full h-24 object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => setTemplateData((prev) => ({ ...prev, background_image_url: '' }))}
                    className="mt-2 text-xs px-2 py-1.5 rounded border border-[#d8d3c7] hover:bg-[#f6f2e8]"
                  >
                    <ImagePlus className="w-3.5 h-3.5 inline mr-1" /> Replace/Remove
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-[#e6e1d5] bg-[#f7f5ef] p-3 space-y-2">
              <div className="text-xs font-semibold text-[#4a554e]">Canvas Tools</div>
              <label className="flex items-center gap-2 text-xs text-[#4a554e]">
                <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} disabled={teacherEditingLocked} />
                Snap to grid
              </label>
              <label className="flex items-center gap-2 text-xs text-[#4a554e]">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} disabled={teacherEditingLocked} />
                Show grid
              </label>
              <div>
                <label className="block text-[11px] text-[#6f7a72] mb-1">Grid size</label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={2}
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={teacherEditingLocked}
                  className="w-full"
                />
              </div>
            </div>
          </IslamicCard>

          <IslamicCard className="xl:col-span-6 p-4 border border-[#e6e1d5] bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-[#1f2a24]">Live Certificate Preview</div>
              <div className="text-xs text-[#6f7a72]">Drag fields. Center guides appear automatically.</div>
            </div>

            <div
              ref={canvasRef}
              className="relative w-full max-w-full mx-auto border border-slate-300 rounded-xl overflow-hidden bg-white"
              style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
            >
              {templateData.background_image_url ? (
                <img src={templateData.background_image_url} alt="Certificate background" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className={`absolute inset-0 ${THEME_PRESETS[currentTheme].backgroundClass}`} />
              )}

              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)`,
                    backgroundSize: `${(gridSize / CANVAS_WIDTH) * 100}% ${(gridSize / CANVAS_HEIGHT) * 100}%`,
                  }}
                />
              )}

              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 bottom-0" style={{ left: `${(centerGuideX / CANVAS_WIDTH) * 100}%`, borderLeft: `1px dashed ${nearCenterX ? '#0d9488' : 'rgba(15,23,42,0.25)'}` }} />
                <div className="absolute left-0 right-0" style={{ top: `${(centerGuideY / CANVAS_HEIGHT) * 100}%`, borderTop: `1px dashed ${nearCenterY ? '#0d9488' : 'rgba(15,23,42,0.25)'}` }} />
              </div>

              {(Object.keys(templateData.placeholders) as PlaceholderKey[]).map((key) => {
                const item = templateData.placeholders[key];
                const selected = key === selectedPlaceholder;
                const xPercent = (item.x / CANVAS_WIDTH) * 100;
                const yPercent = (item.y / CANVAS_HEIGHT) * 100;

                return (
                  <div
                    key={key}
                    onMouseDown={() => {
                      if (teacherEditingLocked) return;
                      setSelectedPlaceholder(key);
                      setDraggingKey(key);
                    }}
                    className={`absolute select-none rounded-md px-2 py-1 ${teacherEditingLocked ? 'cursor-not-allowed' : 'cursor-move'} ${selected ? 'ring-2 ring-teal-500 bg-white/95' : 'bg-white/70'}`}
                    style={{
                      left: `${xPercent}%`,
                      top: `${yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      color: item.color,
                      fontSize: `${Math.max(12, item.fontSize * 0.72)}px`,
                      fontWeight: item.fontWeight,
                    }}
                  >
                    {key === 'qr_code' ? (
                      <div
                        className="border border-slate-600/60 bg-white/95 rounded-md flex items-center justify-center"
                        style={{ width: `${Math.max(18, item.fontSize * 1.8)}px`, height: `${Math.max(18, item.fontSize * 1.8)}px` }}
                      >
                        <Move className="w-4 h-4" />
                      </div>
                    ) : (
                      SAMPLE_TEXT[key]
                    )}
                  </div>
                );
              })}
            </div>
          </IslamicCard>

          <IslamicCard className="xl:col-span-3 p-5 border border-[#e6e1d5] bg-[#fdfcf8] space-y-4">
            <h3 className="text-base font-semibold text-[#1f2a24]">Field Controls</h3>
            <div className="text-xs text-[#6f7a72] leading-5">
              Platform: {currentPlatform} · Teacher edits: {templateData.allow_teacher_edits ? 'enabled' : 'locked'}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Field</label>
              <select
                value={selectedPlaceholder}
                onChange={(e) => setSelectedPlaceholder(e.target.value as PlaceholderKey)}
                disabled={teacherEditingLocked}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {(Object.keys(templateData.placeholders) as PlaceholderKey[]).map((key) => (
                  <option key={key} value={key}>{PLACEHOLDER_LABELS[key]}</option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">Align Selected</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => alignSelected('left')} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">Left</button>
                <button type="button" onClick={() => alignSelected('top')} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">Top</button>
                <button type="button" onClick={() => alignSelected('centerX')} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">Center X</button>
                <button type="button" onClick={() => alignSelected('centerY')} className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white">Center Y</button>
              </div>
              <button
                type="button"
                onClick={distributeFooterFields}
                disabled={teacherEditingLocked}
                className="mt-2 w-full px-2 py-1.5 text-xs border border-slate-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Equal Spacing (Footer Fields)
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700 mb-2">Nudge Position</div>
              <div className="grid grid-cols-3 gap-1.5 max-w-[140px]">
                <span />
                <button type="button" onClick={() => nudgePlaceholder(0, -5)} disabled={teacherEditingLocked} className="h-8 border border-slate-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUp className="w-4 h-4 mx-auto" /></button>
                <span />
                <button type="button" onClick={() => nudgePlaceholder(-5, 0)} disabled={teacherEditingLocked} className="h-8 border border-slate-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowLeft className="w-4 h-4 mx-auto" /></button>
                <button type="button" onClick={() => nudgePlaceholder(0, 5)} disabled={teacherEditingLocked} className="h-8 border border-slate-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowDown className="w-4 h-4 mx-auto" /></button>
                <button type="button" onClick={() => nudgePlaceholder(5, 0)} disabled={teacherEditingLocked} className="h-8 border border-slate-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"><ArrowRight className="w-4 h-4 mx-auto" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">X</label>
                <input
                  type="number"
                  value={selectedField.x}
                  onChange={(e) => updatePlaceholder(selectedPlaceholder, { x: clamp(Number(e.target.value) || 0, 0, CANVAS_WIDTH) })}
                  disabled={teacherEditingLocked}
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Y</label>
                <input
                  type="number"
                  value={selectedField.y}
                  onChange={(e) => updatePlaceholder(selectedPlaceholder, { y: clamp(Number(e.target.value) || 0, 0, CANVAS_HEIGHT) })}
                  disabled={teacherEditingLocked}
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{selectedPlaceholder === 'qr_code' ? 'QR Size' : 'Font Size'}</label>
              <input
                type="number"
                value={selectedField.fontSize}
                onChange={(e) => updatePlaceholder(selectedPlaceholder, { fontSize: clamp(Number(e.target.value) || 16, 8, 140) })}
                disabled={teacherEditingLocked}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="range"
                min={8}
                max={140}
                step={1}
                value={selectedField.fontSize}
                onChange={(e) => updatePlaceholder(selectedPlaceholder, { fontSize: Number(e.target.value) || 16 })}
                disabled={teacherEditingLocked}
                className="w-full mt-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
              <input
                type="color"
                value={selectedField.color}
                onChange={(e) => updatePlaceholder(selectedPlaceholder, { color: e.target.value })}
                disabled={teacherEditingLocked}
                className="w-full h-10 border border-slate-300 rounded-lg"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updatePlaceholder(selectedPlaceholder, { color })}
                    disabled={teacherEditingLocked}
                    className="w-5 h-5 rounded-full border border-slate-300"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Weight</label>
              <input
                type="number"
                min={300}
                max={900}
                step={100}
                value={selectedField.fontWeight}
                onChange={(e) => updatePlaceholder(selectedPlaceholder, { fontWeight: Number(e.target.value) || 600 })}
                  disabled={teacherEditingLocked}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </IslamicCard>

          <IslamicCard className="xl:col-span-12 p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <IslamicButton variant="outline" onClick={() => setViewMode('library')}>
                Cancel
              </IslamicButton>

              {mode === 'teacher' && (
                <IslamicButton variant="primary" onClick={() => saveTemplate(true)} disabled={saving || !templateName.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit For Approval
                </IslamicButton>
              )}

              {mode === 'admin' && (
                <IslamicButton variant="secondary" onClick={() => saveTemplate(false)} disabled={saving || !templateName.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Template
                </IslamicButton>
              )}

              {mode === 'admin' && selectedTemplateId && (
                <IslamicButton variant="success" onClick={approveTemplate} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve Template
                </IslamicButton>
              )}
            </div>
          </IslamicCard>
        </div>
      )}
    </div>
  );
}
