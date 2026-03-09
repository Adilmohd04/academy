'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, Save, Upload, Download, CheckCircle, 
  AlertCircle, User, Search, Filter 
} from 'lucide-react';

interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image_url?: string;
}

interface ExamSession {
  id: string;
  title: string;
  exam_type: 'interview' | 'written' | 'practical' | 'viva';
  exam_date: string;
  total_marks: number;
  passing_marks: number;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface MarkEntry {
  student_id: string;
  marks_obtained: number;
  remarks?: string;
  attendance_status: 'present' | 'absent' | 'excused';
}

interface ExamMarksFormProps {
  session: ExamSession;
  students: {
    marked: Array<Student & { marks_obtained: number; grade: string; attendance_status: string }>;
    unmarked: Student[];
  };
  onSaveMarks: (marks: MarkEntry[]) => void;
  onVerifyAll: () => void;
  isLoading?: boolean;
}

export function ExamMarksForm({
  session,
  students,
  onSaveMarks,
  onVerifyAll,
  isLoading = false
}: ExamMarksFormProps) {
  const [marks, setMarks] = useState<Record<string, MarkEntry>>(() => {
    const initial: Record<string, MarkEntry> = {};
    students.marked.forEach(s => {
      initial[s.student_id] = {
        student_id: s.student_id,
        marks_obtained: s.marks_obtained,
        remarks: '',
        attendance_status: s.attendance_status as MarkEntry['attendance_status']
      };
    });
    students.unmarked.forEach(s => {
      initial[s.student_id] = {
        student_id: s.student_id,
        marks_obtained: 0,
        remarks: '',
        attendance_status: 'present'
      };
    });
    return initial;
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmarked, setShowOnlyUnmarked] = useState(false);

  const allStudents = [...students.marked, ...students.unmarked];
  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = `${s.first_name} ${s.last_name} ${s.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    if (showOnlyUnmarked) {
      return matchesSearch && students.unmarked.some(u => u.student_id === s.student_id);
    }
    return matchesSearch;
  });

  const updateMark = (studentId: string, field: keyof MarkEntry, value: any) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const calculateGrade = (score: number) => {
    const percentage = (score / session.total_marks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'A-';
    if (percentage >= 75) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 65) return 'B-';
    if (percentage >= 60) return 'C+';
    if (percentage >= 55) return 'C';
    if (percentage >= 50) return 'C-';
    if (percentage >= 45) return 'D+';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const handleSave = () => {
    const marksArray = Object.values(marks).filter(m => 
      m.attendance_status === 'present' && m.marks_obtained >= 0
    );
    onSaveMarks(marksArray);
  };

  const markedCount = students.marked.length;
  const totalCount = allStudents.length;
  const progressPercent = totalCount > 0 ? (markedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{session.title}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {session.exam_type.charAt(0).toUpperCase() + session.exam_type.slice(1)} Exam • 
              Total Marks: {session.total_marks} • 
              Passing: {session.passing_marks}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            session.status === 'completed' ? 'bg-green-100 text-green-700' :
            session.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {session.status.replace('_', ' ').charAt(0).toUpperCase() + 
             session.status.replace('_', ' ').slice(1)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{markedCount} / {totalCount} marked</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyUnmarked}
              onChange={(e) => setShowOnlyUnmarked(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Show only unmarked</span>
          </label>
        </div>
      </div>

      {/* Marks Entry Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-32">Attendance</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-32">
                  Marks (/{session.total_marks})
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-20">Grade</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-24">Result</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-48">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => {
                const entry = marks[student.student_id];
                const isPresent = entry?.attendance_status === 'present';
                const marksVal = entry?.marks_obtained || 0;
                const grade = calculateGrade(marksVal);
                const isPassing = marksVal >= session.passing_marks;
                const isMarked = students.marked.some(m => m.student_id === student.student_id);

                return (
                  <tr key={student.student_id} className={isMarked ? 'bg-green-50/50' : ''}>
                    {/* Student Info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.profile_image_url ? (
                          <img 
                            src={student.profile_image_url} 
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-medium">
                            {student.first_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                        {isMarked && (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                        )}
                      </div>
                    </td>

                    {/* Attendance */}
                    <td className="px-4 py-3 text-center">
                      <select
                        value={entry?.attendance_status || 'present'}
                        onChange={(e) => updateMark(student.student_id, 'attendance_status', e.target.value)}
                        className="px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>

                    {/* Marks */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={session.total_marks}
                        value={entry?.marks_obtained || ''}
                        onChange={(e) => updateMark(
                          student.student_id, 
                          'marks_obtained', 
                          Math.min(session.total_marks, Math.max(0, parseInt(e.target.value) || 0))
                        )}
                        disabled={!isPresent}
                        className="w-20 px-2 py-1 text-center border border-gray-200 rounded focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </td>

                    {/* Grade */}
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${
                        isPresent ? (
                          grade.startsWith('A') ? 'text-emerald-600' :
                          grade.startsWith('B') ? 'text-blue-600' :
                          grade.startsWith('C') ? 'text-yellow-600' :
                          grade === 'F' ? 'text-red-600' : 'text-orange-600'
                        ) : 'text-gray-400'
                      }`}>
                        {isPresent ? grade : '-'}
                      </span>
                    </td>

                    {/* Result */}
                    <td className="px-4 py-3 text-center">
                      {isPresent ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isPassing ? 'PASS' : 'FAIL'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry?.remarks || ''}
                        onChange={(e) => updateMark(student.student_id, 'remarks', e.target.value)}
                        placeholder="Optional..."
                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <User className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No students found</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between gap-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onVerifyAll}
            className="px-4 py-2 text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Verify All
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Marks'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Statistics Card
export function ExamStatistics({
  statistics
}: {
  statistics: {
    total_students: number;
    marks_entered: number;
    average: number;
    highest: number;
    lowest: number;
    pass_count: number;
    fail_count: number;
    absent_count: number;
  };
}) {
  const passRate = statistics.marks_entered > 0 
    ? ((statistics.pass_count / statistics.marks_entered) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Average Score</p>
        <p className="text-2xl font-bold text-gray-800">{statistics.average.toFixed(1)}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Highest</p>
        <p className="text-2xl font-bold text-emerald-600">{statistics.highest}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Pass Rate</p>
        <p className="text-2xl font-bold text-blue-600">{passRate}%</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500">Absent</p>
        <p className="text-2xl font-bold text-gray-600">{statistics.absent_count}</p>
      </div>
    </div>
  );
}
