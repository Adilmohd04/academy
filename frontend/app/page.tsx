/**
 * Islamic Learning Platform - Landing Page
 */

import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import RoleBasedRedirect from './RoleBasedRedirect';

export default async function Home() {
  const { userId } = await auth();
  
  // If logged in, show redirect component that will fetch role and redirect
  if (userId) {
    return <RoleBasedRedirect />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Islamic Academy
              </h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#courses" className="text-gray-700 hover:text-emerald-600 transition-colors font-medium">
                Courses
              </a>
              <a href="#about" className="text-gray-700 hover:text-emerald-600 transition-colors font-medium">
                About
              </a>
              <a href="#teachers" className="text-gray-700 hover:text-emerald-600 transition-colors font-medium">
                Teachers
              </a>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/sign-in" className="px-6 py-2.5 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Decorative Background */}
        <div className="absolute top-20 right-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-full mb-8 shadow-sm">
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-emerald-700 font-semibold text-sm">Helping You Fulfill Your Obligation</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 mb-8 leading-tight">
              <span className="block">LEARN</span>
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent block">
                ISLAM
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-2xl md:text-3xl text-gray-700 font-medium mb-4">
              HELPING YOU FULFILL YOUR OBLIGATION
            </p>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-4xl mx-auto leading-relaxed">
              Free online Islamic courses under the guidance of scholars who follow the Quran & Sunnah
              <br />
              <span className="text-emerald-600 font-semibold">رضي الله عنهم</span> on the understanding & practice of the Salaba
            </p>
            
            <p className="text-lg text-gray-500 mb-12 max-w-3xl mx-auto">
              Join thousands of students worldwide in understanding and practicing authentic Islamic teachings
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-16">
              <Link
                href="/sign-up"
                className="group w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Start Learning Free</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              <Link
                href="/sign-in"
                className="w-full sm:w-auto px-10 py-5 bg-white text-emerald-600 rounded-2xl font-bold text-lg hover:shadow-xl border-2 border-emerald-300 hover:border-emerald-400 transition-all duration-200"
              >
                Browse Courses
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100">
                <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  10K+
                </div>
                <div className="text-gray-600 font-semibold">Students</div>
              </div>
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100">
                <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  50+
                </div>
                <div className="text-gray-600 font-semibold">Teachers</div>
              </div>
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100">
                <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  100+
                </div>
                <div className="text-gray-600 font-semibold">Courses</div>
              </div>
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100">
                <div className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  15K+
                </div>
                <div className="text-gray-600 font-semibold">Graduates</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="courses" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
              LATEST COURSE(S)
            </h2>
            <p className="text-xl text-gray-600">
              Start your Islamic education journey with our comprehensive courses
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Course 1 */}
            <div className="group bg-gradient-to-br from-white to-emerald-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-emerald-100 hover:border-emerald-300">
              <div className="h-56 bg-gradient-to-br from-red-600 via-red-700 to-black relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-black/30"></div>
                <h3 className="relative z-10 text-4xl font-bold text-white text-center px-4">
                  JINNS &<br/>BLACK MAGIC
                </h3>
                <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                  LEARN ISLAM
                </div>
              </div>
              <div className="p-8">
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Discusses the world of the unseen - Jinns & Black Magic. The symptoms, protection & cure based on Qur'an & Sunnah.
                </p>
                <Link
                  href="/sign-up"
                  className="block w-full text-center bg-gradient-to-r from-gray-800 to-black text-white py-3.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
                >
                  JOIN NOW
                </Link>
              </div>
            </div>

            {/* Course 2 */}
            <div className="group bg-gradient-to-br from-white to-emerald-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-emerald-100 hover:border-emerald-300">
              <div className="h-56 bg-gradient-to-br from-green-400 to-teal-700 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                <div className="relative z-10 bg-white/90 backdrop-blur-sm px-8 py-4 rounded-2xl">
                  <h3 className="text-6xl font-bold text-gray-900 text-center">
                    Evil<br/>Eye
                  </h3>
                </div>
                <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                  LEARN ISLAM
                </div>
              </div>
              <div className="p-8">
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Covers topics about causes, prevention, cure & misconceptions about the Evil Eye. Also includes Important Adhkaar and lessons about Tawakkul, Tawba & Trials.
                </p>
                <Link
                  href="/sign-up"
                  className="block w-full text-center bg-gradient-to-r from-gray-800 to-black text-white py-3.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
                >
                  JOIN NOW
                </Link>
              </div>
            </div>

            {/* Course 3 */}
            <div className="group bg-gradient-to-br from-white to-emerald-50 rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-emerald-100 hover:border-emerald-300">
              <div className="h-56 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden flex items-center justify-center">
                <svg className="w-32 h-32 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold">
                  LEARN ISLAM
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Quran Studies
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  Learn to recite, understand, and implement the teachings of the Quran in your daily life with proper Tajweed.
                </p>
                <Link
                  href="/sign-up"
                  className="block w-full text-center bg-gradient-to-r from-gray-800 to-black text-white py-3.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
                >
                  JOIN NOW
                </Link>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-16">
            <Link
              href="/sign-up"
              className="inline-flex items-center space-x-2 px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              <span>VIEW ALL COURSES</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-700/50 backdrop-blur-sm p-12 rounded-3xl border border-slate-600 relative">
            <svg className="w-16 h-16 text-emerald-400 mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            
            <p className="text-xl text-white mb-8 leading-relaxed italic">
              "It's wonderful platform for people to have basic knowledge about Islam and the beauty as it is being with comprehensive and Affortless age groups. Keep the good work going."
            </p>
            
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                M
              </div>
              <div>
                <div className="text-white font-bold text-lg">MOHAMMED ZAKIRUDDIN SOHAIL</div>
                <div className="text-emerald-400 font-medium">Student</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEyYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMTIgMTJjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Begin Your Islamic<br />Journey Today
          </h2>
          <p className="text-2xl text-emerald-50 mb-12 leading-relaxed">
            Join thousands of students learning authentic Islamic knowledge from qualified scholars
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link
              href="/sign-up"
              className="px-12 py-5 bg-white text-emerald-600 rounded-2xl font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Create Free Account
            </Link>
            <Link
              href="/sign-in"
              className="px-12 py-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xl border-2 border-white/20 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-emerald-50 text-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Free to Start</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Expert Teachers</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Flexible Schedule</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-2xl font-bold">ISLAMIC ACADEMY</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                Authentic Islamic education platform dedicated to spreading knowledge of the Quran and Sunnah.
              </p>
              <p className="text-emerald-400 text-xl font-semibold">
                May Allah accept our efforts - آمين
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <div className="space-y-3">
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">About Us</Link>
                <Link href="#courses" className="block text-gray-400 hover:text-white transition-colors">Courses</Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Teachers</Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Contact</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-4">Support</h3>
              <div className="space-y-3">
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Help Center</Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400 text-lg">
              © 2025 Islamic Academy. All rights reserved.
            </p>
            <p className="text-emerald-400 mt-3 text-lg">
              الحمد لله رب العالمين
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
