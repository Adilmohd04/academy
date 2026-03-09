'use client';

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, TrendingUp, Award, CheckCircle, 
  Clock, FileText, AlertCircle, Trophy, Target,
  BarChart3, PieChart, Calendar
} from 'lucide-react';
import { 
  GradingSheetData, GradeCategory, WeeklyGradeBreakdown,
  StudentCourseProgress, StudentGrades 
} from '@/types/lms';
import { format } from 'date-fns';

interface CourseGradingProps {
  courseId: string;
  studentId: string;
}

export default function CourseGrading({ courseId, studentId }: CourseGradingProps) {
  const [gradingData, setGradingData] = useState<GradingSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'summary' | 'weekly'>('summary');

  useEffect(() => {
    fetchGradingData();
  }, [courseId, studentId]);

  const fetchGradingData = async () => {
    // TODO: Fetch from API
    setLoading(false);
  };

  const getLetterGradeColor = (letterGrade: string) => {
    if (letterGrade === 'A' || letterGrade === 'A+') return 'text-green-600 bg-green-100';
    if (letterGrade === 'A-' || letterGrade === 'B+' || letterGrade === 'B') return 'text-blue-600 bg-blue-100';
    if (letterGrade === 'B-' || letterGrade === 'C+' || letterGrade === 'C') return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Mock data for demonstration
  const mockData: GradingSheetData = {
    courseId,
    courseName: 'Introduction to Islamic Studies',
    studentId,
    studentName: 'Student Name',
    gradingConfig: {
      activityPercentage: 25,
      quizPercentage: 20,
      midtermPercentage: 20,
      finalExamPercentage: 30,
      attendancePercentage: 5,
      passingGrade: 60
    },
    categories: [
      {
        name: 'Activities & Assignments',
        type: 'activity',
        weight: 25,
        marksObtained: 85,
        totalMarks: 100,
        percentage: 85,
        weightedScore: 21.25,
        items: []
      },
      {
        name: 'Weekly Quizzes',
        type: 'quiz',
        weight: 20,
        marksObtained: 78,
        totalMarks: 100,
        percentage: 78,
        weightedScore: 15.6,
        items: []
      },
      {
        name: 'Midterm Exam',
        type: 'midterm',
        weight: 20,
        marksObtained: 82,
        totalMarks: 100,
        percentage: 82,
        weightedScore: 16.4,
        items: []
      },
      {
        name: 'Final Exam',
        type: 'final_exam',
        weight: 30,
        marksObtained: 88,
        totalMarks: 100,
        percentage: 88,
        weightedScore: 26.4,
        items: []
      },
      {
        name: 'Attendance',
        type: 'attendance',
        weight: 5,
        marksObtained: 95,
        totalMarks: 100,
        percentage: 95,
        weightedScore: 4.75,
        items: []
      }
    ],
    totalWeighted: 84.4,
    finalGrade: 84.4,
    letterGrade: 'B+',
    passed: true,
    weeklyBreakdown: [],
    generatedAt: new Date().toISOString()
  };

  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Overall Performance</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-emerald-100 text-sm mb-1">Final Grade</p>
              <p className="text-4xl font-bold">{mockData.finalGrade.toFixed(1)}%</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-emerald-100 text-sm mb-1">Letter Grade</p>
              <p className="text-4xl font-bold">{mockData.letterGrade}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-emerald-100 text-sm mb-1">Status</p>
              <div className="flex items-center gap-2">
                {mockData.passed ? (
                  <>
                    <CheckCircle className="h-6 w-6" />
                    <p className="text-2xl font-bold">Passing</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-2xl font-bold">Need Improvement</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
            <p className="text-sm">
              <strong>Passing Requirement:</strong> {mockData.gradingConfig.passingGrade}% or higher
            </p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('summary')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'summary'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Grade Summary
        </button>
        <button
          onClick={() => setActiveView('weekly')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeView === 'weekly'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Weekly Breakdown
        </button>
      </div>

      {/* Grade Summary View */}
      {activeView === 'summary' && (
        <div className="space-y-4">
          {/* Grade Categories */}
          {mockData.categories.map((category, index) => (
            <GradeCategoryCard key={index} category={category} />
          ))}

          {/* Weighted Total */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Total Weighted Score</h3>
                  <p className="text-sm text-gray-600">Your overall course grade</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-700">
                  {mockData.totalWeighted.toFixed(2)}%
                </p>
                <p className={`text-sm font-bold px-3 py-1 rounded-full inline-block ${getLetterGradeColor(mockData.letterGrade)}`}>
                  Grade: {mockData.letterGrade}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Grade Distribution
            </h3>
            <div className="space-y-4">
              {mockData.categories.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{category.name}</span>
                    <span className="text-sm font-bold text-gray-800">
                      {category.percentage.toFixed(1)}% ({category.weightedScore.toFixed(2)} pts)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        category.percentage >= 90 ? 'bg-green-500' :
                        category.percentage >= 80 ? 'bg-blue-500' :
                        category.percentage >= 70 ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Breakdown View */}
      {activeView === 'weekly' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Weekly Performance
          </h3>
          <p className="text-gray-600">Weekly breakdown will be displayed here with detailed performance metrics for each week.</p>
        </div>
      )}
    </div>
  );
}

// Grade Category Card Component
function GradeCategoryCard({ category }: { category: GradeCategory }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'activity': return FileText;
      case 'quiz': return CheckCircle;
      case 'midterm': return Award;
      case 'final_exam': return Trophy;
      case 'attendance': return Clock;
      default: return FileText;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'activity': return 'from-emerald-500 to-teal-600';
      case 'quiz': return 'from-purple-500 to-indigo-600';
      case 'midterm': return 'from-amber-500 to-orange-600';
      case 'final_exam': return 'from-red-500 to-rose-600';
      case 'attendance': return 'from-blue-500 to-cyan-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const Icon = getCategoryIcon(category.type);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getCategoryColor(category.type)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <Icon className="h-7 w-7 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
              <span className="text-sm text-gray-500">Weight: {category.weight}%</span>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getCategoryColor(category.type)}`}
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {category.marksObtained} / {category.totalMarks} marks
              </span>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-gray-800">
                  {category.percentage.toFixed(1)}%
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  +{category.weightedScore.toFixed(2)} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Items */}
        {category.items.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'} ({category.items.length} items)
          </button>
        )}
      </div>

      {isExpanded && category.items.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="space-y-2">
            {category.items.map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    {item.gradedAt && (
                      <p className="text-xs text-gray-500">
                        Graded on {format(new Date(item.gradedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {item.marksObtained !== undefined ? (
                      <>
                        <p className="font-bold text-gray-800">
                          {item.marksObtained} / {item.totalMarks}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.percentage?.toFixed(1)}%
                        </p>
                      </>
                    ) : (
                      <span className="text-sm text-amber-600 font-medium">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
