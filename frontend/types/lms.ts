/**
 * LMS Type Definitions
 * Comprehensive types for Learning Management System with Islamic theme
 */

export type CourseStatus = 'draft' | 'published' | 'archived';
export type ClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'late';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'audio_upload' | 'video_upload' | 'interview';
export type AssessmentType = 'quiz' | 'activity' | 'assignment' | 'midterm' | 'final_exam';
export type FinalExamType = 'quiz' | 'audio' | 'video' | 'interview' | 'mixed';
export type StudentCategory = 'beginner' | 'intermediate' | 'advanced' | 'special_needs' | 'vip';
export type InterviewStatus = 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';

// Course Structure
export interface CourseDetail {
  id: string;
  title: string;
  description: string;
  about: string;
  thumbnail?: string;
  teacherId: string;
  teacherName: string;
  teacherImage?: string;
  teacherBio?: string;
  duration_weeks: number;
  price: number;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  isPublished: boolean;
  enrollmentCount: number;
  rating?: number;
  totalReviews?: number;
  
  // Grading Configuration
  gradingConfig: GradingConfiguration;
  
  // Course dates
  startDate?: string;
  endDate?: string;
  enrollmentDeadline?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface GradingConfiguration {
  activityPercentage: number;      // Activities/assignments weight
  quizPercentage: number;           // Weekly quizzes weight
  midtermPercentage: number;        // Midterm exam weight
  finalExamPercentage: number;      // Final exam weight
  attendancePercentage: number;     // Class attendance weight
  passingGrade: number;             // Minimum grade to pass (e.g., 60)
}

// Week Structure
export interface CourseWeek {
  id: string;
  courseId: string;
  weekNumber: number;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  status: 'upcoming' | 'current' | 'completed';
  isUnlocked: boolean;
  
  // Content organized by chapters
  chapters: WeekChapter[];
  topics: WeekTopic[];
  classes: WeekClass[];
  videos: WeekVideo[];
  quiz?: WeekQuiz;
  activities: WeekActivity[];
  
  createdAt: string;
  updatedAt: string;
}

// Chapter Structure (Week 1 -> Chapter 1, Chapter 2, etc.)
export interface WeekChapter {
  id: string;
  weekId: string;
  chapterNumber: number;
  title: string;
  description: string;
  order: number;
  
  // Content in this chapter
  topics: WeekTopic[];
  videos: WeekVideo[];
  resources: TopicResource[];
  
  // Completion tracking
  isCompleted: boolean;
  completedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Topic within a week
export interface WeekTopic {
  id: string;
  weekId: string;
  title: string;
  description: string;
  order: number;
  duration_minutes?: number;
  
  // Related content
  videos: WeekVideo[];
  resources: TopicResource[];
}

// Live/Scheduled Classes
export interface WeekClass {
  id: string;
  weekId: string;
  topicId?: string;
  chapterId?: string;
  title: string;
  description: string;
  scheduledAt: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  duration_minutes: number;
  
  // Meeting Details
  meetingUrl?: string;
  meetingPassword?: string;
  meetingPlatform?: 'google_meet' | 'zoom' | 'teams' | 'other';
  recordingUrl?: string;
  
  // Status
  status: ClassStatus;
  isLive: boolean;
  canJoin: boolean; // Can join 30 mins before
  
  // Enrollment
  enrolledStudents?: number;
  
  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  rescheduledTo?: string;
  
  // Attendance
  attendanceRequired: boolean;
  attendees?: ClassAttendee[];
  
  teacherId: string;
  teacherName?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ClassAttendee {
  studentId: string;
  studentName: string;
  joinedAt: string;
  leftAt?: string;
  duration_minutes: number;
  attended: boolean;
}

// Video Content
export interface WeekVideo {
  id: string;
  weekId: string;
  topicId?: string;
  chapterId?: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration_seconds: number;
  order: number;
  
  // Organization (e.g., "Week 1 - Chapter 1")
  chapterLabel?: string;
  
  // Video Settings
  isPublic: boolean;
  canDownload: boolean;
  
  // Source (recorded from live class or uploaded)
  sourceType: 'live_recording' | 'uploaded';
  sourceClassId?: string; // If from live class
  
  // Tracking
  views: number;
  
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
}

export interface VideoProgress {
  id: string;
  videoId: string;
  studentId: string;
  watchedSeconds: number;
  totalSeconds: number;
  progress: number; // 0-100
  completed: boolean;
  lastWatchedAt: string;
}

// Resources/Materials
export interface TopicResource {
  id: string;
  topicId: string;
  title: string;
  description?: string;
  type: 'pdf' | 'document' | 'slides' | 'link' | 'other';
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  order: number;
  
  uploadedBy: string;
  uploadedAt: string;
}

// Quiz System
export interface WeekQuiz {
  id: string;
  weekId: string;
  title: string;
  description: string;
  instructions: string;
  
  // Timing
  availableFrom?: string;
  availableTo?: string;
  timeLimit_minutes?: number;
  
  // Settings
  totalMarks: number;
  passingMarks: number;
  attemptsAllowed: number;
  showAnswersAfterSubmit: boolean;
  showAnswersAfterDeadline: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  
  // Questions
  questions: QuizQuestion[];
  
  // Status
  isPublished: boolean;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionType: QuestionType;
  questionText: string;
  questionImage?: string;
  marks: number;
  order: number;
  
  // For multiple choice/true-false
  options?: QuestionOption[];
  correctOptionId?: string;
  
  // For text answers
  correctAnswer?: string;
  sampleAnswer?: string;
  
  // For uploads
  maxFileSize_mb?: number;
  allowedFileTypes?: string[];
  uploadInstructions?: string;
  
  explanation?: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionImage?: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  
  // Timing
  startedAt: string;
  submittedAt?: string;
  timeSpent_seconds: number;
  
  // Scoring
  totalMarks: number;
  marksObtained?: number;
  percentage?: number;
  passed?: boolean;
  
  // Answers
  answers: QuizAnswer[];
  
  // Status
  status: SubmissionStatus;
  isLate: boolean;
  
  gradedBy?: string;
  gradedAt?: string;
  feedback?: string;
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  questionType: QuestionType;
  
  // Answer data
  selectedOptionId?: string;
  textAnswer?: string;
  fileUrl?: string;
  
  // Grading
  marksAwarded?: number;
  isCorrect?: boolean;
  feedback?: string;
}

// Activity/Assignment System
export interface WeekActivity {
  id: string;
  weekId: string;
  type: AssessmentType;
  title: string;
  description: string;
  instructions: string;
  
  // Timing
  assignedDate: string;
  dueDate: string;
  lateSubmissionAllowed: boolean;
  latePenaltyPercentage?: number;
  
  // Grading
  totalMarks: number;
  rubric?: GradingRubric;
  
  // Files
  attachments: ActivityAttachment[];
  
  // Submission settings
  submissionType: 'file' | 'text' | 'link' | 'multiple';
  maxFileSize_mb?: number;
  allowedFileTypes?: string[];
  requiresPeerReview: boolean;
  
  isPublished: boolean;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityAttachment {
  id: string;
  activityId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface GradingRubric {
  id: string;
  activityId: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  name: string;
  description: string;
  maxMarks: number;
  order: number;
}

export interface ActivitySubmission {
  id: string;
  activityId: string;
  studentId: string;
  
  // Submission content
  textContent?: string;
  linkUrl?: string;
  files: SubmissionFile[];
  
  // Timing
  submittedAt: string;
  isLate: boolean;
  resubmissionCount: number;
  
  // Grading
  status: SubmissionStatus;
  marksObtained?: number;
  percentage?: number;
  feedback?: string;
  criteriaGrades?: CriterionGrade[];
  
  gradedBy?: string;
  gradedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionFile {
  id: string;
  submissionId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface CriterionGrade {
  criterionId: string;
  marksAwarded: number;
  feedback?: string;
}

// Final Exam
export interface FinalExam {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: FinalExamType;
  
  // Scheduling
  scheduledDate?: string;
  releaseDate: string;
  releaseTime: string;
  dueDate: string;
  dueTime: string;
  
  // Settings
  duration_minutes?: number;
  totalMarks: number;
  passingMarks: number;
  attemptsAllowed: number;
  instructions: string;
  
  // Content
  questions: QuizQuestion[];
  
  // Interview Settings (for interview type)
  interviewSettings?: FinalExamInterviewSettings;
  
  // Answer visibility
  showAnswersAfterSubmit: boolean;
  answerReleaseDate?: string;
  
  isPublished: boolean;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Interview-based Final Exam Settings
export interface FinalExamInterviewSettings {
  id: string;
  examId: string;
  
  // Meeting platform
  platform: 'google_meet' | 'zoom' | 'teams';
  
  // Student categorization
  categorizeStudents: boolean;
  categories?: StudentExamCategory[];
  
  // Scheduling
  slotDuration_minutes: number;
  breakBetweenSlots_minutes: number;
  availableTimeSlots: ExamTimeSlot[];
  
  // Interview rooms
  maxStudentsPerSlot: number;
  separateRooms: boolean; // Individual or group interviews
  
  // Settings
  allowRescheduling: boolean;
  rescheduleDeadline?: string;
  requiresConfirmation: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface StudentExamCategory {
  id: string;
  name: string;
  description?: string;
  studentIds: string[];
  color: string; // For UI identification
  priority: number; // For scheduling order
}

export interface ExamTimeSlot {
  id: string;
  examId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  bookedStudents: number;
  categoryId?: string; // Reserved for specific category
  meetingUrl?: string;
  meetingPassword?: string;
  status: 'available' | 'full' | 'in_progress' | 'completed' | 'cancelled';
}

export interface StudentExamInterview {
  id: string;
  examId: string;
  studentId: string;
  slotId: string;
  categoryId?: string;
  
  // Scheduling
  scheduledDate: string;
  scheduledTime: string;
  duration_minutes: number;
  
  // Meeting details
  meetingUrl: string;
  meetingPassword?: string;
  platform: 'google_meet' | 'zoom' | 'teams';
  
  // Status
  status: InterviewStatus;
  confirmationSentAt?: string;
  confirmedAt?: string;
  
  // Rescheduling
  rescheduledFrom?: string;
  rescheduledReason?: string;
  rescheduledBy?: string;
  
  // Results
  attended: boolean;
  marksObtained?: number;
  feedback?: string;
  interviewNotes?: string;
  
  gradedBy?: string;
  gradedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Student Progress & Grades
export interface StudentCourseProgress {
  id: string;
  courseId: string;
  studentId: string;
  
  // Overall progress
  overallProgress: number; // 0-100
  currentWeek: number;
  completedWeeks: number;
  
  // Attendance
  classesAttended: number;
  totalClasses: number;
  attendancePercentage: number;
  
  // Video progress
  videosWatched: number;
  totalVideos: number;
  videoProgress: number;
  
  // Grades
  grades: StudentGrades;
  finalGrade?: number;
  letterGrade?: string;
  passed?: boolean;
  
  // Status
  enrollmentDate: string;
  completionDate?: string;
  certificateIssued: boolean;
  
  lastAccessedAt: string;
  updatedAt: string;
}

export interface StudentGrades {
  // Activity grades
  activityMarks: number;
  activityTotal: number;
  activityPercentage: number;
  
  // Quiz grades
  quizMarks: number;
  quizTotal: number;
  quizPercentage: number;
  
  // Midterm
  midtermMarks?: number;
  midtermTotal?: number;
  midtermPercentage?: number;
  
  studentCategory?: StudentCategory;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  certificateIssued: boolean;
}

// Student Profile in Course Context
export interface CourseStudent {
  id: string;
  studentId: string;
  courseId: string;
  firstName: string;
  lastName: string;
  studentName: string; // Full name
  studentEmail: string;
  email: string;
  category: StudentCategory;
  profileImage?: string;
  
  // Performance
  currentGrade: number;
  attendance: number;
  
  // Final exam assignment
  examInterviewId?: string;
  examSlotId?: string;
  
  // Attendance
  attendancePercentage: number;
  
  // Calculated final
  weightedTotal: number;
  finalGrade: number;
  letterGrade: string;
}

// Grading Sheet Display
export interface GradingSheetData {
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  
  // Configuration
  gradingConfig: GradingConfiguration;
  
  // Grade breakdown
  categories: GradeCategory[];
  
  // Summary
  totalWeighted: number;
  finalGrade: number;
  letterGrade: string;
  gpa?: number;
  passed: boolean;
  
  // Details
  weeklyBreakdown: WeeklyGradeBreakdown[];
  
  generatedAt: string;
}

export interface GradeCategory {
  name: string;
  type: 'activity' | 'quiz' | 'midterm' | 'final_exam' | 'attendance';
  weight: number; // percentage
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  weightedScore: number;
  items: GradeItem[];
}

export interface GradeItem {
  id: string;
  name: string;
  type: string;
  marksObtained?: number;
  totalMarks: number;
  percentage?: number;
  submittedAt?: string;
  gradedAt?: string;
  feedback?: string;
  status: SubmissionStatus;
}

export interface WeeklyGradeBreakdown {
  weekNumber: number;
  weekTitle: string;
  activities: GradeItem[];
  quiz?: GradeItem;
  attendance: {
    attended: number;
    total: number;
    percentage: number;
  };
}

// Announcements
export interface CourseAnnouncement {
  id: string;
  courseId: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  isPinned: boolean;
  
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

// Course Enrollment
export interface CourseEnrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  certificateIssued: boolean;
}
