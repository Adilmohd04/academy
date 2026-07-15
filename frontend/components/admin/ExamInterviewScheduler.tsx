'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Video, Users, Plus, CheckCircle,
  Edit2, Trash2, Settings, Save
} from 'lucide-react';
import {
  FinalExam,
  ExamTimeSlot,
  StudentExamCategory,
  CourseStudent
} from '@/types/lms';
import { format, addMinutes, parse } from 'date-fns';

interface ExamInterviewSchedulerProps {
  exam: FinalExam;
  courseId: string;
}

export default function ExamInterviewScheduler({ exam, courseId }: ExamInterviewSchedulerProps) {
  const [students] = useState<CourseStudent[]>([]);
  const [categories] = useState<StudentExamCategory[]>([]);
  const [timeSlots] = useState<ExamTimeSlot[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [exam.id, courseId]);

  const fetchData = async () => {
    try {
      // TODO: Fetch from API
      // GET /api/courses/:courseId/students
      // GET /api/exams/:examId/categories
      // GET /api/exams/:examId/interview-slots
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
        <p className="text-emerald-100">Interview Scheduling & Student Categorization</p>
      </div>

      {/* Settings Panel */}
      <InterviewSettings exam={exam} />

      {/* Student Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Student Categories</h2>
            <p className="text-sm text-gray-600">Organize students into groups for scheduling</p>
          </div>
          <button
            onClick={() => setShowCategoryForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-4">No categories created yet</p>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Create First Category
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                students={students}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Time Slots */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Interview Time Slots</h2>
            <p className="text-sm text-gray-600">Create and manage available interview slots</p>
          </div>
          <button
            onClick={() => setShowSlotForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Time Slot
          </button>
        </div>

        {timeSlots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-4">No time slots created yet</p>
            <button
              onClick={() => setShowSlotForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Create First Slot
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {timeSlots.map((slot) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                categories={categories}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Student Assignment */}
      <StudentAssignment
        students={students}
        categories={categories}
        onAssign={(studentId, categoryId) => {}}
      />

      {/* Modals */}
      {showCategoryForm && (
        <CategoryFormModal
          onClose={() => setShowCategoryForm(false)}
          onSave={(category) => {}}
        />
      )}

      {showSlotForm && (
        <SlotFormModal
          exam={exam}
          categories={categories}
          onClose={() => setShowSlotForm(false)}
          onSave={(slot) => {}}
        />
      )}
    </div>
  );
}

// Interview Settings Component
function InterviewSettings({ exam }: { exam: FinalExam }) {
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(exam.interviewSettings);

  if (!settings) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Interview Settings</h2>
        <button
          onClick={() => setEditing(!editing)}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Platform</p>
          {editing ? (
            <select
              value={settings.platform}
              onChange={(e) => setSettings({ ...settings, platform: e.target.value as typeof settings.platform })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
            </select>
          ) : (
            <p className="font-bold text-gray-800">
              {settings.platform === 'google_meet' ? '📞 Google Meet' :
               settings.platform === 'zoom' ? '📞 Zoom' : '📞 Teams'}
            </p>
          )}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Duration per Student</p>
          {editing ? (
            <input
              type="number"
              value={settings.slotDuration_minutes}
              onChange={(e) => setSettings({ ...settings, slotDuration_minutes: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          ) : (
            <p className="font-bold text-gray-800">{settings.slotDuration_minutes} minutes</p>
          )}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Max Students per Slot</p>
          {editing ? (
            <input
              type="number"
              value={settings.maxStudentsPerSlot}
              onChange={(e) => setSettings({ ...settings, maxStudentsPerSlot: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          ) : (
            <p className="font-bold text-gray-800">{settings.maxStudentsPerSlot}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.categorizeStudents}
            onChange={(e) => setSettings({ ...settings, categorizeStudents: e.target.checked })}
            disabled={!editing}
            className="w-5 h-5 text-emerald-600 rounded"
          />
          <span className="text-gray-700">Enable Student Categorization</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.allowRescheduling}
            onChange={(e) => setSettings({ ...settings, allowRescheduling: e.target.checked })}
            disabled={!editing}
            className="w-5 h-5 text-emerald-600 rounded"
          />
          <span className="text-gray-700">Allow Students to Reschedule</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.requiresConfirmation}
            onChange={(e) => setSettings({ ...settings, requiresConfirmation: e.target.checked })}
            disabled={!editing}
            className="w-5 h-5 text-emerald-600 rounded"
          />
          <span className="text-gray-700">Require Student Confirmation</span>
        </label>
      </div>

      {editing && (
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
}

// Category Card Component
function CategoryCard({
  category,
  students,
  onEdit,
  onDelete
}: {
  category: StudentExamCategory;
  students: CourseStudent[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignedStudents = students.filter((s) =>
    category.studentIds.includes(s.studentId)
  );

  return (
    <div className="border-2 rounded-lg p-4" style={{ borderColor: category.color }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-800">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-gray-600">{category.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <Users className="h-4 w-4" />
          <span>{assignedStudents.length} students</span>
        </div>
        <span
          className="px-2 py-1 text-xs font-medium rounded"
          style={{ backgroundColor: category.color + '20', color: category.color }}
        >
          Priority: {category.priority}
        </span>
      </div>

      {assignedStudents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-1">
            {assignedStudents.slice(0, 3).map((student) => (
              <div key={student.studentId} className="text-sm text-gray-600">
                • {student.studentName}
              </div>
            ))}
            {assignedStudents.length > 3 && (
              <div className="text-sm text-gray-500">
                + {assignedStudents.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Time Slot Card Component
function TimeSlotCard({
  slot,
  categories,
  onEdit,
  onDelete
}: {
  slot: ExamTimeSlot;
  categories: StudentExamCategory[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const category = categories.find((c) => c.id === slot.categoryId);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-gray-800">
                {format(new Date(slot.date), 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-gray-800">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {slot.bookedStudents} / {slot.maxStudents} booked
              </span>
            </div>

            {category && (
              <span
                className="px-2 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: category.color + '20', color: category.color }}
              >
                {category.name}
              </span>
            )}

            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              slot.status === 'available' ? 'bg-green-100 text-green-700' :
              slot.status === 'full' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {slot.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {slot.meetingUrl && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <a
            href={slot.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
          >
            <Video className="h-4 w-4" />
            View Meeting Link
          </a>
        </div>
      )}
    </div>
  );
}

// Student Assignment Component
function StudentAssignment({
  students,
  categories,
  onAssign
}: {
  students: CourseStudent[];
  categories: StudentExamCategory[];
  onAssign: (studentId: string, categoryId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const unassignedStudents = students.filter(
    (s) => !s.category || !categories.some((c) => c.studentIds.includes(s.studentId))
  );

  const filteredStudents = unassignedStudents.filter((s) =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Unassigned Students</h2>

      <input
        type="text"
        placeholder="Search students..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
      />

      {filteredStudents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="text-gray-600">All students have been assigned to categories</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStudents.map((student) => (
            <div
              key={student.studentId}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-800">{student.studentName}</p>
                <p className="text-sm text-gray-600">{student.studentEmail}</p>
              </div>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onAssign(student.studentId, e.target.value);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                defaultValue=""
              >
                <option value="">Assign to category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Category Form Modal
function CategoryFormModal({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (category: Partial<StudentExamCategory>) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#10b981');
  const [priority, setPriority] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, color, priority, studentIds: [] });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Create Category</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Beginners, Advanced, VIP"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority (1-10)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Create Category
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Slot Form Modal
function SlotFormModal({
  exam,
  categories,
  onClose,
  onSave
}: {
  exam: FinalExam;
  categories: StudentExamCategory[];
  onClose: () => void;
  onSave: (slot: Partial<ExamTimeSlot>) => void;
}) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [categoryId, setCategoryId] = useState<string>('');
  const [maxStudents, setMaxStudents] = useState(
    exam.interviewSettings?.maxStudentsPerSlot || 1
  );

  const duration = exam.interviewSettings?.slotDuration_minutes || 30;
  const endTime = startTime
    ? format(
        addMinutes(parse(startTime, 'HH:mm', new Date()), duration),
        'HH:mm'
      )
    : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      date,
      startTime,
      endTime,
      maxStudents,
      categoryId: categoryId || undefined,
      bookedStudents: 0,
      status: 'available'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Create Time Slot</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Students per Slot
            </label>
            <input
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(parseInt(e.target.value))}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reserved for Category (Optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Students</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Create Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
