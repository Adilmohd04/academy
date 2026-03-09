/**
 * Little Muslima Academy - Brand Configuration
 * Central configuration for branding, colors, and platform settings
 */

export const BRAND_CONFIG = {
  // Academy Information
  name: 'Little Muslima Academy',
  shortName: 'Little Muslima',
  arabicName: 'أكاديمية المسلمة الصغيرة',
  tagline: 'Islamic Education for Young Learners',
  arabicTagline: 'التعليم الإسلامي للمتعلمين الشباب',
  
  // Contact Information
  email: 'info@littlemuslima.com',
  supportEmail: 'support@littlemuslima.com',
  phone: '+1 (555) 123-4567', // Update with real phone
  
  // Social Media
  social: {
    facebook: 'https://facebook.com/littlemuslima',
    twitter: 'https://twitter.com/littlemuslima',
    instagram: 'https://instagram.com/littlemuslima',
    youtube: 'https://youtube.com/littlemuslima',
  },
  
  // Brand Colors (matching Islamic design system)
  colors: {
    primary: '#0F4C3A', // Deep Forest Green
    secondary: '#D4AF37', // Sacred Gold
    accent: '#059669', // Emerald
    background: '#F4E9D8', // Sand
    text: '#0E1A2B', // Midnight
  },
  
  // Platform Features
  features: {
    enableGoogleMeet: true,
    enablePayments: true,
    enableCertificates: true,
    enableAttendance: true,
    enableAssignments: true,
    enableAnalytics: true,
  },
  
  // Business Settings
  currency: '₹',
  timezone: 'Asia/Kolkata',
  locale: 'en-IN',
  
  // Greetings
  greetings: {
    admin: {
      english: 'As-salamu alaykum',
      arabic: 'السلام عليكم'
    },
    teacher: {
      english: 'Barakallahu feek',
      arabic: 'بارك الله فيك'
    },
    student: {
      english: 'Marhaba',
      arabic: 'مرحبا'
    }
  },
  
  // Islamic Phrases
  phrases: {
    bismillah: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ',
    bismillahTranslation: 'In the name of Allah, the Most Gracious, the Most Merciful',
    alhamdulillah: 'الحمد لله',
    alhamdulillahTranslation: 'All praise is due to Allah',
    subhanallah: 'سبحان الله',
    subhanallahTranslation: 'Glory be to Allah',
    mashaallah: 'ما شاء الله',
    mashaallahTranslation: 'What Allah wills',
    iqra: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
    iqraTranslation: 'Read! In the name of your Lord who created. (Surah Al-Alaq 96:1)',
  },
  
  // Dashboard Settings
  dashboard: {
    adminTitle: 'Admin Dashboard',
    teacherTitle: 'Teacher Dashboard',
    studentTitle: 'Student Dashboard',
    recentActivityLimit: 10,
    upcomingSessionsLimit: 5,
    topTeachersLimit: 5,
  },
  
  // Payment Settings
  payment: {
    defaultMeetingPrice: 500,
    currency: '₹',
    paymentMethods: ['Razorpay', 'Manual'],
    refundPolicy: 'No refunds are processed for booked meetings',
  },
  
  // Notification Settings
  notifications: {
    enableEmail: true,
    enableSMS: false,
    enablePush: true,
    emailNotifications: {
      meetingApproval: true,
      paymentConfirmation: true,
      classReminder: true,
      assignmentDue: true,
    }
  },
  
  // File Upload Settings
  uploads: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.png'],
    maxFilesPerUpload: 5,
  },
  
  // Session Settings
  session: {
    defaultDuration: 60, // minutes
    bufferTime: 10, // minutes
    maxStudentsPerSession: 30,
    allowLateJoin: 15, // minutes
  },
};

// Helper function to get formatted greeting
export const getGreeting = (role: 'admin' | 'teacher' | 'student', userName?: string) => {
  const greeting = BRAND_CONFIG.greetings[role];
  return {
    english: `${greeting.english}${userName ? `, ${userName}` : ''}`,
    arabic: greeting.arabic,
  };
};

// Helper function to get brand name with role
export const getBrandTitle = (role?: 'admin' | 'teacher' | 'student') => {
  if (!role) return BRAND_CONFIG.name;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  return `${BRAND_CONFIG.shortName} - ${roleLabel}`;
};

// Helper function to format currency
export const formatCurrency = (amount: number) => {
  return `${BRAND_CONFIG.currency}${amount.toLocaleString('en-IN')}`;
};

// Helper function to get feature flag
export const isFeatureEnabled = (feature: keyof typeof BRAND_CONFIG.features) => {
  return BRAND_CONFIG.features[feature];
};
