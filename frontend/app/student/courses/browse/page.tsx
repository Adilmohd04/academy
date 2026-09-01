'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Search, BookOpen, Users, Star, Loader2, Filter, Calendar, Award } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

interface Course {
  id: string;
  title: string;
  description: string;
  course_image_url?: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  price: number;
  teacher_id: string;
  teacher_name: string;
  created_at: string;
  start_date?: string;
  course_type?: string;
  total_lessons: number;
  total_students: number;
  enrolled_count?: number;
  enrollment_limit?: number;
  enrollment_cap?: number;
  average_rating?: number;
  total_reviews?: number;
  is_enrolled: boolean;
  status?: string;
}

const CATEGORIES = [
  'All Courses',
  'Quran',
  'Islamic Studies',
  'Arabic Language',
  'Fiqh',
  'Hadith',
  'Tafsir',
  'Seerah',
  'General'
];

const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlaceholderValue(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (UUID_REGEX.test(normalized)) return true;
  return /^(unknown(\s+teacher|\s+instructor)?|n\/a|null|undefined)$/i.test(normalized);
}

function safeTeacherName(teacherName?: string): string {
  return isPlaceholderValue(teacherName) ? 'Teacher' : teacherName!.trim();
}

function safeCourseTitle(title?: string): string {
  return isPlaceholderValue(title) ? 'Course' : title!.trim();
}

export default function BrowseCoursesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Courses');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [courses, searchQuery, selectedCategory, selectedLevel, priceFilter]);

  const fetchCourses = async () => {
    try {
      // Fetch only approved courses with approval_status filter
      const res = await fetch('/api/student/courses/browse', {
        headers: { 'x-clerk-user-id': userId || '' }
      });
      if (res.ok) {
        const data = await res.json();
        // Handle both array and nested response formats
        const coursesArray = Array.isArray(data) ? data : (data.courses || data.data || []);
        setCourses(coursesArray);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!Array.isArray(courses)) return;
    // Filter out already enrolled and full courses
    let filtered = courses.filter((course) => {
      if (course.is_enrolled) return false;

      const cap = course.enrollment_cap || course.enrollment_limit;
      const enrolled = course.total_students || course.enrolled_count || 0;
      const isFull = typeof cap === 'number' && cap > 0 && enrolled >= cap;

      return !isFull;
    });

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All Courses') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Level filter
    if (selectedLevel !== 'All Levels') {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    // Price filter
    if (priceFilter === 'free') {
      filtered = filtered.filter(course => course.price === 0);
    } else if (priceFilter === 'paid') {
      filtered = filtered.filter(course => course.price > 0);
    }

    setFilteredCourses(filtered);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Hero Section */}
      <div className="bg-[#FDFBF7] py-12 px-6 border-b border-[#E2E8F0] relative overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231B365D' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-5xl font-serif text-[#1B365D] mb-4 font-bold leading-tight">
            Discover <span className="text-[#C5A059]">Courses</span>
          </h1>
          <p className="text-[#64748B] font-medium text-lg mb-8 max-w-2xl">
            Explore a garden of knowledge taught by experienced teachers. May your journey be blessed.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] group-focus-within:text-[#C5A059] transition-colors" />
            <input
              type="text"
              placeholder="Search for courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#1B365D] shadow-sm hover:border-[#1B365D]/20 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Category Pills */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    selectedCategory === category
                      ? 'bg-[#1B365D] text-white border-[#1B365D] shadow-md'
                      : 'bg-white text-[#64748B] hover:bg-[#FDFBF7] border-[#E2E8F0]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Level & Price Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Level */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Level:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#1B365D] text-sm focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059]"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Price:</span>
              <div className="flex gap-2">
                {['all', 'free', 'paid'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPriceFilter(filter as typeof priceFilter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      priceFilter === filter
                        ? 'bg-[#1B365D] text-white border-[#1B365D]'
                        : 'bg-white text-[#64748B] hover:bg-[#FDFBF7] border-[#E2E8F0]'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold">{filteredCourses.length}</span> course{filteredCourses.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
            <h3 className="text-xl font-serif text-[#1B365D] mb-2 font-bold">No courses found</h3>
            <p className="text-[#64748B]">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group cursor-pointer"
                onClick={() => router.push(`/student/courses/browse/${course.id}`)}
              >
              <IslamicCard 
                className="h-full hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 bg-white"
              >
                <div className="relative h-48 bg-[#FDFBF7] overflow-hidden border-b border-[#E2E8F0]">
                  {(course.course_image_url || course.thumbnail_url) ? (
                    <img 
                      src={course.course_image_url || course.thumbnail_url} 
                      alt={safeCourseTitle(course.title)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-[#E2E8F0]" />
                    </div>
                  )}
                  {/* Price Badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-[#E2E8F0]">
                    <span className="text-sm font-bold text-[#10B981]">
                      {course.price === 0 || !course.price ? 'FREE' : `₹${course.price}`}
                    </span>
                  </div>
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 bg-[#1B365D]/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-xs font-semibold text-white">
                      {course.category || 'General'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Level & Status */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#10B981] bg-[#F0F7F4] border border-[#D1E7DD] px-3 py-1 rounded-full">
                      {course.level || 'beginner'}
                    </span>
                    {/* Status Badge - Only show "Available" for enrolled status, nothing for browse */}
                    {course.is_enrolled ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#C5A059] border border-[#a67d3f] px-3 py-1 rounded-full">
                        Enrolled
                      </span>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#10B981] border border-[#059669] px-3 py-1 rounded-full">
                        Available
                      </span>
                    )}
                    {/* Rating */}
                    {course.average_rating && course.total_reviews ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold text-slate-700">
                          {course.average_rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({course.total_reviews})
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-serif font-bold text-[#1B365D] line-clamp-2 leading-tight group-hover:text-[#C5A059] transition-colors">
                    {safeCourseTitle(course.title)}
                  </h3>

                  {/* Description */}
                  <p className="text-base text-slate-600 line-clamp-3 leading-relaxed min-h-[72px]">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-3 pb-4 border-b border-[#E2E8F0]">
                    <div className="w-10 h-10 rounded-full bg-[#1B365D] flex items-center justify-center text-[#C5A059] font-serif font-bold text-sm shadow-sm">
                      {safeTeacherName(course.teacher_name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8] uppercase tracking-wider">Taught by</p>
                      <p className="text-sm font-serif font-bold italic text-[#10B981]">{safeTeacherName(course.teacher_name)}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Users className="w-4 h-4 text-[#C5A059]" />
                      <span className="text-xs">
                        <span className="font-semibold text-[#1B365D]">{course.total_students || course.enrolled_count || 0}</span> students
                        {(course.enrollment_cap || course.enrollment_limit) && (
                          <span className="text-[#94A3B8] ml-1">
                            / {course.enrollment_cap || course.enrollment_limit} max
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <BookOpen className="w-4 h-4 text-[#C5A059]" />
                      <span className="text-xs">
                        <span className="font-semibold text-[#1B365D]">{course.total_lessons || 0}</span> lessons
                      </span>
                    </div>
                  </div>

                  {/* Spots Left Badge */}
                  {(course.enrollment_cap || course.enrollment_limit) && (
                    <div>
                      {(() => {
                        const cap = course.enrollment_cap || course.enrollment_limit;
                        const enrolled = course.total_students || course.enrolled_count || 0;
                        const spotsLeft = cap - enrolled;
                        const isAlmostFull = spotsLeft > 0 && spotsLeft <= 5;
                        
                        return (
                          <div className={`flex items-center gap-2 p-2 rounded-lg border ${
                            isAlmostFull ? 'bg-amber-50 border-amber-200' : 
                            'bg-emerald-50 border-emerald-200'
                          }`}>
                            <Award className={`w-4 h-4 ${
                              isAlmostFull ? 'text-amber-600' : 
                              'text-emerald-600'
                            }`} />
                            <span className={`text-xs font-medium ${
                              isAlmostFull ? 'text-amber-800' : 
                              'text-emerald-800'
                            }`}>
                              {isAlmostFull ? `⚠️ Only ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left!` : 
                               `✅ ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Start Date for Live/Hybrid Courses */}
                  {course.start_date && (course.course_type === 'live' || course.course_type === 'hybrid') && (
                    <div className="flex items-center gap-2 mb-4 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-amber-800">
                        Starts: <span className="font-semibold">{new Date(course.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <IslamicButton
                      variant={course.price === 0 || !course.price ? 'primary' : 'secondary'}
                      className="w-full"
                      onClick={() => router.push(`/student/courses/browse/${course.id}`)}
                    >
                      {course.price === 0 || !course.price ? 'View Course' : 'View Details & Enroll'}
                    </IslamicButton>
                  </div>
                </div>
              </IslamicCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
