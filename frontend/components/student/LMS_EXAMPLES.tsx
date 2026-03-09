/**
 * Example Usage of LMS Components
 * This file demonstrates how to use all the LMS components together
 */

import React from 'react';
import CourseDetailPage from '@/components/student/CourseDetailPage';
import QuizTaker, { QuizResults } from '@/components/student/QuizTaker';
import { 
  CourseDetail, 
  StudentCourseProgress,
  WeekQuiz,
  QuizAttempt 
} from '@/types/lms';

// Example: Course Page
export function ExampleCoursePage() {
  // Mock course data
  const mockCourse: CourseDetail = {
    id: 'course-1',
    title: 'Introduction to Islamic Studies',
    description: 'Comprehensive study of Islamic principles and practices',
    about: 'This course provides a thorough introduction to Islamic Studies, covering fundamental concepts, history, and practical applications. Students will engage with authentic sources and contemporary scholarship to develop a deep understanding of Islam.',
    thumbnail: '/images/islamic-studies.jpg',
    teacherId: 'teacher-1',
    teacherName: 'Sheikh Ahmed Al-Hassan',
    teacherImage: '/images/teachers/ahmed.jpg',
    teacherBio: 'Sheikh Ahmed has over 15 years of experience teaching Islamic Studies and holds a PhD in Islamic Theology from Al-Azhar University.',
    duration_weeks: 12,
    price: 299,
    category: 'Islamic Studies',
    level: 'beginner',
    language: 'English',
    isPublished: true,
    enrollmentCount: 245,
    rating: 4.8,
    totalReviews: 89,
    gradingConfig: {
      activityPercentage: 25,
      quizPercentage: 20,
      midtermPercentage: 20,
      finalExamPercentage: 30,
      attendancePercentage: 5,
      passingGrade: 60
    },
    startDate: '2025-01-15T00:00:00Z',
    endDate: '2025-04-15T00:00:00Z',
    enrollmentDeadline: '2025-01-10T23:59:59Z',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-29T00:00:00Z'
  };

  // Mock student progress
  const mockProgress: StudentCourseProgress = {
    id: 'progress-1',
    courseId: 'course-1',
    studentId: 'student-1',
    overallProgress: 45,
    currentWeek: 5,
    completedWeeks: 4,
    classesAttended: 8,
    totalClasses: 12,
    attendancePercentage: 67,
    videosWatched: 15,
    totalVideos: 24,
    videoProgress: 63,
    grades: {
      activityMarks: 85,
      activityTotal: 100,
      activityPercentage: 85,
      quizMarks: 78,
      quizTotal: 100,
      quizPercentage: 78,
      midtermMarks: 82,
      midtermTotal: 100,
      midtermPercentage: 82,
      studentCategory: 'intermediate',
      enrolledAt: '2025-01-10T10:00:00Z',
      status: 'active',
      paymentStatus: 'paid',
      certificateIssued: false
    },
    enrollmentDate: '2025-01-10T10:00:00Z',
    lastAccessedAt: '2025-01-29T14:30:00Z',
    certificateIssued: false,
    updatedAt: '2025-01-29T14:30:00Z'
  };

  return (
    <CourseDetailPage 
      course={mockCourse}
      progress={mockProgress}
      isEnrolled={true}
    />
  );
}

// Example: Quiz Taking
export function ExampleQuizPage() {
  const mockQuiz: WeekQuiz = {
    id: 'quiz-1',
    weekId: 'week-1',
    title: 'Week 1 Quiz: Foundations of Islam',
    description: 'Test your understanding of the fundamental concepts covered in Week 1',
    instructions: 'Answer all questions to the best of your ability. You have 30 minutes to complete this quiz. Each question is worth equal marks.',
    availableFrom: '2025-01-20T00:00:00Z',
    availableTo: '2025-01-27T23:59:59Z',
    timeLimit_minutes: 30,
    totalMarks: 100,
    passingMarks: 60,
    attemptsAllowed: 2,
    showAnswersAfterSubmit: false,
    showAnswersAfterDeadline: true,
    shuffleQuestions: true,
    shuffleOptions: true,
    questions: [
      {
        id: 'q1',
        quizId: 'quiz-1',
        questionType: 'multiple_choice',
        questionText: 'What are the Five Pillars of Islam?',
        marks: 10,
        order: 1,
        options: [
          {
            id: 'opt1',
            questionId: 'q1',
            optionText: 'Shahada, Salah, Zakat, Sawm, Hajj',
            isCorrect: true,
            order: 1
          },
          {
            id: 'opt2',
            questionId: 'q1',
            optionText: 'Prayer, Fasting, Charity, Pilgrimage, Jihad',
            isCorrect: false,
            order: 2
          },
          {
            id: 'opt3',
            questionId: 'q1',
            optionText: 'Faith, Prayer, Charity, Honesty, Kindness',
            isCorrect: false,
            order: 3
          },
          {
            id: 'opt4',
            questionId: 'q1',
            optionText: 'Belief, Worship, Morality, Justice, Brotherhood',
            isCorrect: false,
            order: 4
          }
        ],
        correctOptionId: 'opt1',
        explanation: 'The Five Pillars of Islam are Shahada (declaration of faith), Salah (prayer), Zakat (charity), Sawm (fasting during Ramadan), and Hajj (pilgrimage to Mecca).'
      },
      {
        id: 'q2',
        quizId: 'quiz-1',
        questionType: 'true_false',
        questionText: 'The Quran was revealed over a period of 23 years.',
        marks: 10,
        order: 2,
        correctAnswer: 'True',
        explanation: 'The Quran was revealed to Prophet Muhammad (peace be upon him) over approximately 23 years.'
      },
      {
        id: 'q3',
        quizId: 'quiz-1',
        questionType: 'short_answer',
        questionText: 'Explain the meaning of "Tawhid" in your own words.',
        marks: 15,
        order: 3,
        sampleAnswer: 'Tawhid means the Oneness of Allah. It is the fundamental concept in Islam that Allah is One, unique, and has no partners or equals.'
      },
      {
        id: 'q4',
        quizId: 'quiz-1',
        questionType: 'essay',
        questionText: 'Discuss the importance of the five daily prayers in Islam and how they contribute to a Muslim\'s spiritual development.',
        marks: 25,
        order: 4,
        sampleAnswer: 'The five daily prayers (Salah) are a cornerstone of Islamic practice...'
      }
    ],
    isPublished: true,
    createdBy: 'teacher-1',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  };

  const handleQuizSubmit = async (answers: any[]) => {
    console.log('Quiz submitted:', answers);
    // TODO: Send to API
    // POST /api/quizzes/quiz-1/submit
  };

  return (
    <QuizTaker 
      quiz={mockQuiz}
      onSubmit={handleQuizSubmit}
    />
  );
}

// Example: Quiz Results
export function ExampleQuizResultsPage() {
  const mockQuiz: WeekQuiz = {
    // ... same as above
    id: 'quiz-1',
    weekId: 'week-1',
    title: 'Week 1 Quiz: Foundations of Islam',
    description: 'Test your understanding',
    instructions: 'Answer all questions',
    totalMarks: 100,
    passingMarks: 60,
    attemptsAllowed: 2,
    showAnswersAfterSubmit: true,
    showAnswersAfterDeadline: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: [],
    isPublished: true,
    createdBy: 'teacher-1',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  };

  const mockAttempt: QuizAttempt = {
    id: 'attempt-1',
    quizId: 'quiz-1',
    studentId: 'student-1',
    attemptNumber: 1,
    startedAt: '2025-01-20T10:00:00Z',
    submittedAt: '2025-01-20T10:25:00Z',
    timeSpent_seconds: 1500,
    totalMarks: 100,
    marksObtained: 85,
    percentage: 85,
    passed: true,
    answers: [],
    status: 'graded',
    isLate: false,
    gradedBy: 'teacher-1',
    gradedAt: '2025-01-20T12:00:00Z',
    feedback: 'Excellent work! You demonstrated a strong understanding of the fundamental concepts.'
  };

  return (
    <QuizResults 
      quiz={mockQuiz}
      attempt={mockAttempt}
    />
  );
}

// Example: API Integration Helper
export class LMSApiService {
  private baseUrl = '/api';

  // Course APIs
  async getCourse(courseId: string): Promise<CourseDetail> {
    const response = await fetch(`${this.baseUrl}/courses/${courseId}`);
    return response.json();
  }

  async getCourseProgress(courseId: string, studentId: string): Promise<StudentCourseProgress> {
    const response = await fetch(`${this.baseUrl}/courses/${courseId}/progress?studentId=${studentId}`);
    return response.json();
  }

  async getCourseWeeks(courseId: string) {
    const response = await fetch(`${this.baseUrl}/courses/${courseId}/weeks`);
    return response.json();
  }

  // Quiz APIs
  async startQuiz(quizId: string) {
    const response = await fetch(`${this.baseUrl}/quizzes/${quizId}/attempts`, {
      method: 'POST'
    });
    return response.json();
  }

  async submitQuiz(quizId: string, attemptId: string, answers: any[]) {
    const response = await fetch(`${this.baseUrl}/quizzes/${quizId}/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    return response.json();
  }

  async getQuizResults(quizId: string, attemptId: string) {
    const response = await fetch(`${this.baseUrl}/quizzes/${quizId}/attempts/${attemptId}`);
    return response.json();
  }

  // Activity APIs
  async getActivities(courseId: string) {
    const response = await fetch(`${this.baseUrl}/courses/${courseId}/activities`);
    return response.json();
  }

  async submitActivity(activityId: string, formData: FormData) {
    const response = await fetch(`${this.baseUrl}/activities/${activityId}/submit`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  async getActivitySubmission(activityId: string, studentId: string) {
    const response = await fetch(`${this.baseUrl}/activities/${activityId}/submissions?studentId=${studentId}`);
    return response.json();
  }

  // Grading APIs
  async getStudentGrades(courseId: string, studentId: string) {
    const response = await fetch(`${this.baseUrl}/courses/${courseId}/grades?studentId=${studentId}`);
    return response.json();
  }

  // Video Progress APIs
  async updateVideoProgress(videoId: string, watchedSeconds: number) {
    const response = await fetch(`${this.baseUrl}/videos/${videoId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchedSeconds })
    });
    return response.json();
  }
}

// Example: Using the API Service
export function ExampleApiUsage() {
  const api = new LMSApiService();

  const loadCourseData = async (courseId: string, studentId: string) => {
    try {
      // Load course details
      const course = await api.getCourse(courseId);
      
      // Load student progress
      const progress = await api.getCourseProgress(courseId, studentId);
      
      // Load weeks
      const weeks = await api.getCourseWeeks(courseId);
      
      // Load activities
      const activities = await api.getActivities(courseId);
      
      // Load grades
      const grades = await api.getStudentGrades(courseId, studentId);
      
      return { course, progress, weeks, activities, grades };
    } catch (error) {
      console.error('Error loading course data:', error);
      throw error;
    }
  };

  return { loadCourseData };
}

export default {
  ExampleCoursePage,
  ExampleQuizPage,
  ExampleQuizResultsPage,
  LMSApiService,
  ExampleApiUsage
};
