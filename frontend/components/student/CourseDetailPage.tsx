'use client';

import React, { useState } from 'react';
import { 
  BookOpen, Calendar, GraduationCap, FileText, 
  Clock, Users, Award, ChevronRight, Star,
  CheckCircle2, Trophy
} from 'lucide-react';
import { CourseDetail, StudentCourseProgress } from '@/types/lms';
import CourseSchedule from './CourseSchedule';
import CourseGrading from './CourseGrading';
import CourseActivities from './CourseActivities';

interface CourseDetailPageProps {
  course: CourseDetail;
  progress: StudentCourseProgress;
  isEnrolled: boolean;
}

type TabType = 'about' | 'schedule' | 'grading' | 'activities';

export default function CourseDetailPage({ 
  course, 
  progress, 
  isEnrolled 
}: CourseDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const tabs = [
    { id: 'about' as TabType, label: 'About Course', icon: BookOpen },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'grading' as TabType, label: 'Grades', icon: GraduationCap },
    { id: 'activities' as TabType, label: 'Activities', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Islamic Pattern Header */}
      <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white overflow-hidden">
        {/* Decorative Islamic Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Course Header */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Course Thumbnail */}
            {course.thumbnail && (
              <div className="w-full lg:w-80 h-48 rounded-xl overflow-hidden shadow-2xl border-4 border-white/20">
                <img 
                  src={course.thumbnail} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Course Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                      {course.category}
                    </span>
                    <span className="px-3 py-1 bg-amber-500/90 backdrop-blur-sm rounded-full text-sm font-medium flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      {course.rating?.toFixed(1) || 'New'}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{course.title}</h1>
                  <p className="text-emerald-100 text-lg max-w-3xl">{course.description}</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-bold">{course.duration_weeks} Weeks</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">Students</span>
                  </div>
                  <p className="text-lg font-bold">{course.enrollmentCount}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                    <Award className="h-4 w-4" />
                    <span className="text-xs font-medium">Level</span>
                  </div>
                  <p className="text-lg font-bold capitalize">{course.level}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 text-emerald-100 mb-1">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs font-medium">Progress</span>
                  </div>
                  <p className="text-lg font-bold">{progress.overallProgress}%</p>
                </div>
              </div>

              {/* Teacher Info */}
              <div className="mt-6 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                {course.teacherImage ? (
                  <img 
                    src={course.teacherImage}
                    alt={course.teacherName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-emerald-100">Instructor</p>
                  <p className="font-semibold text-lg">{course.teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'text-emerald-600 border-emerald-600'
                      : 'text-gray-600 border-transparent hover:text-emerald-600 hover:border-emerald-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'about' && <CourseAboutTab course={course} />}
        {activeTab === 'schedule' && <CourseSchedule courseId={course.id} />}
        {activeTab === 'grading' && <CourseGrading courseId={course.id} studentId={progress.studentId} />}
        {activeTab === 'activities' && <CourseActivities courseId={course.id} />}
      </div>
    </div>
  );
}

// About Tab Component
function CourseAboutTab({ course }: { course: CourseDetail }) {
  return (
    <div className="space-y-6">
      {/* About Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">About This Course</h2>
        </div>
        <div className="prose max-w-none text-gray-600">
          <p className="whitespace-pre-wrap">{course.about}</p>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">What You'll Learn</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            'Master the fundamental concepts',
            'Apply knowledge through practical exercises',
            'Complete hands-on projects',
            'Earn a certificate of completion',
            'Join a community of learners',
            'Get lifetime access to course materials'
          ].map((outcome, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{outcome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grading Policy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">Grading Policy</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <span className="text-gray-700 font-medium">Activities & Assignments</span>
            <span className="text-emerald-700 font-bold">{course.gradingConfig.activityPercentage}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
            <span className="text-gray-700 font-medium">Weekly Quizzes</span>
            <span className="text-teal-700 font-bold">{course.gradingConfig.quizPercentage}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-gray-700 font-medium">Midterm Exam</span>
            <span className="text-blue-700 font-bold">{course.gradingConfig.midtermPercentage}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span className="text-gray-700 font-medium">Final Exam</span>
            <span className="text-purple-700 font-bold">{course.gradingConfig.finalExamPercentage}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
            <span className="text-gray-700 font-medium">Attendance</span>
            <span className="text-amber-700 font-bold">{course.gradingConfig.attendancePercentage}%</span>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Passing Grade:</strong> {course.gradingConfig.passingGrade}% or higher is required to pass this course and receive a certificate.
            </p>
          </div>
        </div>
      </div>

      {/* Instructor Bio */}
      {course.teacherBio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-4">
            {course.teacherImage && (
              <img 
                src={course.teacherImage}
                alt={course.teacherName}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-800">{course.teacherName}</h3>
              <p className="text-sm text-gray-500">Course Instructor</p>
            </div>
          </div>
          <p className="text-gray-600 whitespace-pre-wrap">{course.teacherBio}</p>
        </div>
      )}
    </div>
  );
}
