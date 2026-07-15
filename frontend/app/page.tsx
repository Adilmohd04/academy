'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [email, setEmail] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const statsTargets = [2500, 100, 50, 15];

  useEffect(() => {
    const startedAt = Date.now();
    const durationMs = 1500;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts(statsTargets.map(t => Math.floor(t * eased)));
      if (progress >= 1) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, []);

  const openLogin = () => setShowLogin(true);
  const closeLogin = () => {
    setShowLogin(false);
    setShowRoleSelection(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setShowRoleSelection(true);
  };

  const selectRole = (role: string) => {
    alert(`Entering ${role} Portal...`);
    closeLogin();
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <>
      <div className="selection:bg-teal-100 selection:text-teal-800" onClick={(e) => {
          const target = e.target as HTMLElement;
          const btn = target.closest('button');
          if (btn) {
              const text = btn.innerText || '';
              if (text.includes('Login') || text.includes('Free Trial') || text.includes('Enroll')) {
                  openLogin();
              }
              if (btn.closest('.group') && btn.parentElement?.innerText.includes('?')) {
                 const content = btn.nextElementSibling as HTMLElement;
                 const icon = btn.querySelector('div') as HTMLElement;
                 if (content && icon) {
                     if (content.style.maxHeight) {
                         content.style.maxHeight = '';
                         icon.classList.remove('rotate-180', 'bg-teal-100');
                         icon.classList.add('bg-teal-50');
                     } else {
                         content.style.maxHeight = content.scrollHeight + "px";
                         icon.style.transform = 'rotate(180deg)';
                         icon.classList.remove('bg-teal-50', 'text-teal-600');
                         icon.classList.add('bg-teal-500', 'text-white');
                     }
                 }
              }
          }
      }}>
        
    <div className="ambient-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="bg-grain"></div>
    </div>

    {/*  Login Modal  */}
    {showLogin && (<div id="loginModal"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 transition-all duration-300">
        <div
            className="glass-panel w-full max-w-md p-8 relative overflow-hidden transform transition-all duration-300 animate-fade-up border border-white/50 shadow-2xl">
            <button onClick={closeLogin}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                <iconify-icon icon="solar:close-circle-bold" width="32"></iconify-icon>
            </button>

            <div className="text-center mb-8 relative z-10">
                <div
                    className="mx-auto w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 text-3xl shadow-inner">
                    <iconify-icon icon="solar:user-circle-bold-duotone"></iconify-icon>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Welcome Back!</h3>
                <p className="text-gray-500 text-sm mt-1">Log in to view your courses</p>
            </div>

            <form id="loginForm" onSubmit={handleLogin} className="space-y-4 relative z-10">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email Address</label>
                    <div className="relative">
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com"
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all" />
                        <iconify-icon icon="solar:letter-linear"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></iconify-icon>
                    </div>
                </div>
                <button type="submit"
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2">
                    Enter Academy
                    <iconify-icon icon="solar:login-2-bold-duotone"></iconify-icon>
                </button>
            </form>

            {showRoleSelection && (<div id="roleSelection" className="mt-6 text-center space-y-2">
                <p className="text-sm font-bold text-gray-800 mb-4">Select Portal</p>
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => selectRole('student')}
                        className="p-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs flex flex-col items-center gap-2 transition-colors">
                        <iconify-icon icon="solar:user-hand-up-bold" className="text-xl"></iconify-icon> Student
                    </button>
                    <button onClick={() => selectRole('teacher')}
                        className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs flex flex-col items-center gap-2 transition-colors">
                        <iconify-icon icon="solar:blackboard-bold" className="text-xl"></iconify-icon> Teacher
                    </button>
                    <button onClick={() => selectRole('admin')}
                        className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex flex-col items-center gap-2 transition-colors">
                        <iconify-icon icon="solar:shield-user-bold" className="text-xl"></iconify-icon> Admin
                    </button>
                </div>
            </div>)}
        </div>
    </div>)}

    {/*  Navigation  */}
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 pointer-events-none">
        <div
            className="max-w-7xl mx-auto glass-panel px-6 py-3 flex justify-between items-center transition-all pointer-events-auto">
            <div className="flex items-center gap-2 font-bold text-gray-800 text-xl tracking-tight">
                <span className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white shadow-md">
                    <iconify-icon icon="solar:stars-minimalistic-bold" width="18"></iconify-icon>
                </span>
                Little Muslimah
            </div>

            <div className="hidden md:flex gap-8 font-medium text-sm text-gray-500">
                <a href="#" className="hover:text-teal-600 transition-colors">Curriculum</a>
                <a href="#" className="hover:text-teal-600 transition-colors">Mentors</a>
                <a href="#" className="hover:text-teal-600 transition-colors">About</a>
            </div>

            <div className="flex items-center gap-2">
                <Link
                    href="/sign-in"
                    className="bg-amber-100 text-amber-900 border border-amber-200 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-amber-200 hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2">
                    <iconify-icon icon="solar:user-circle-bold"></iconify-icon> Login
                </Link>
                <Link
                    href="/sign-up"
                    className="bg-teal-600 text-white border border-teal-600 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-teal-500 hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-2">
                    <iconify-icon icon="solar:user-plus-bold"></iconify-icon> Sign Up
                </Link>
            </div>
        </div>
    </nav>

    {/*  Hero Section with Full Cinematic Background  */}
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/*  Full Screen Animated Background  */}
        <div className="absolute inset-0 z-0 select-none">
            <div className="slide-wrapper">
                <img src="/landing/garden.png" className="slide-item" alt="Garden Reading" />
                <img src="/landing/classroom.png" className="slide-item" alt="Classroom" />
                <img src="/landing/hero-image.jpg" className="slide-item" style={{ objectPosition: 'top center' }} alt="Quran Reading" />
                <img src="/landing/art_class.png" className="slide-item" alt="Islamic Art Class" />
                <img src="/landing/stargazing.png" className="slide-item" alt="Stargazing Night" />
            </div>
            {/*  Gradient Overlays for Readability  */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-900/40 to-transparent"></div>
            {/*  Blend to Stats Section (Dark Teal)  */}
            <div className="absolute inset-0 bg-gradient-to-t from-teal-800 via-transparent to-transparent"></div>
            {/*  Grain Texture  */}
            <div
                className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiLz4KPC9zdmc+')] mix-blend-overlay">
            </div>
        </div>

        <div className="relative z-10 w-full max-w-7xl px-6 grid md:grid-cols-2 gap-12 pt-20 items-center">
            <div className="text-left space-y-8">
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold shadow-lg animate-fade-up">
                    <span className="relative flex h-2 w-2">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Enrollment Open for 2026
                </div>

                <h1
                    className="text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[0.9] text-white tracking-tight animate-fade-up delay-100 drop-shadow-lg">
                    Faith.<br />
                    Fun.<br />
                    <span
                        className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 font-serif">Future.</span>
                </h1>

                <p
                    className="text-xl text-teal-50 font-medium max-w-lg leading-relaxed animate-fade-up delay-200 drop-shadow-md">
                    Join a world where learning Quran and Arabic is filled with joy, color, and spiritual growth. A safe
                    digital sanctuary for your little one.
                </p>

                <div className="flex flex-wrap gap-4 animate-fade-up delay-300">
                    <Link
                        href="/sign-up"
                        className="px-10 py-5 bg-amber-500 text-white rounded-2xl font-bold shadow-[0_20px_40px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_20px_40px_-5px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all flex items-center gap-2 group">
                        Start Free Trial
                        <iconify-icon icon="solar:arrow-right-linear"
                            className="group-hover:translate-x-1 transition-transform"></iconify-icon>
                    </Link>
                    <button
                        className="px-10 py-5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center gap-3">
                        <iconify-icon icon="solar:play-circle-bold-duotone"
                            className="text-amber-400 text-2xl"></iconify-icon>
                        Watch Video
                    </button>
                </div>

                {/*  Trust Indicators  */}
                <div
                    className="pt-8 border-t border-white/10 flex items-center gap-8 text-white/80 animate-fade-up delay-300">
                    <div className="flex items-center gap-2">
                        <iconify-icon icon="solar:star-bold" className="text-amber-400"></iconify-icon>
                        <span className="text-sm font-bold">4.9/5 Rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <iconify-icon icon="solar:users-group-rounded-bold" className="text-teal-300"></iconify-icon>
                        <span className="text-sm font-bold">2,000+ Students</span>
                    </div>
                </div>
            </div>

            {/*  Hero Visual/Floating UI  */}
            <div className="hidden md:block relative h-[600px] perspective-1000">
                <div className="relative w-full h-full transform-style-preserve-3d animate-float">
                    {/*  Floating Card 1: Student Success  */}
                    <div
                        className="absolute top-20 right-0 bg-white/90 backdrop-blur-xl p-5 rounded-2xl shadow-2xl max-w-xs transform rotate-y-12 rotate-z-2 border border-white/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div
                                className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                                <iconify-icon icon="solar:cup-star-bold" className="text-xl"></iconify-icon>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">Hifz Completed!</h4>
                                <p className="text-xs text-gray-500">Juz Amma</p>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 w-full animate-[width_1s_ease-out]"></div>
                        </div>
                    </div>

                    {/*  Floating Card 2: Live Class  */}
                    <div
                        className="absolute bottom-40 left-10 bg-gray-900 text-white p-5 rounded-2xl shadow-2xl max-w-xs transform -rotate-y-12 -rotate-z-2 border border-gray-700 z-20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Class</span>
                        </div>
                        <h4 className="font-bold text-lg mb-1">Stories of Prophets</h4>
                        <div className="flex -space-x-2 mt-2">
                            <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-amber-200"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-teal-200"></div>
                            <div className="w-8 h-8 rounded-full border-2 border-gray-900 bg-pink-200"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>

    {/*  Stats Counter Section  */}
    {/*  Stats Counter Section (Light Luxury)  */}
    {/*  Stats Counter Section (Glass)  */}
    <section className="py-12 relative overflow-hidden">
        <div
            className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10 glass-panel py-8">
            <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-extrabold text-amber-500 flex justify-center items-center gap-1">
                    <span>{counts[0]}</span>+
                </div>
                <p className="text-gray-600 font-bold uppercase tracking-wider text-xs">Happy Students</p>
            </div>
            <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-extrabold text-teal-600 flex justify-center items-center gap-1">
                    <span>{counts[1]}</span>%
                </div>
                <p className="text-gray-600 font-bold uppercase tracking-wider text-xs">Live Interaction</p>
            </div>
            <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-extrabold text-pink-500 flex justify-center items-center gap-1">
                    <span>{counts[2]}</span>+
                </div>
                <p className="text-gray-600 font-bold uppercase tracking-wider text-xs">Expert Mentors</p>
            </div>
            <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-extrabold text-teal-600 flex justify-center items-center gap-1">
                    <span>{counts[3]}</span>k
                </div>
                <p className="text-gray-600 font-bold uppercase tracking-wider text-xs">Classes Taught</p>
            </div>
        </div>
    </section>

    {/*  How It Works Section  */} {/*  How It Works Section (Light Luxury - Gold/Teal Accents)  */}
    {/*  How It Works Section (Glass)  */}
    <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
                <span className="text-amber-500 font-bold uppercase tracking-[0.2em] text-sm">Simple
                    Process</span>
                <h2 className="text-4xl font-serif text-gray-900 mt-2">How it works</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative glass-panel p-12">
                {/*  Connector Line  */}
                <div
                    className="hidden md:block absolute top-24 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent -z-10 opacity-50">
                </div>

                <div className="text-center group relative z-10">
                    <div
                        className="w-24 h-24 mx-auto bg-white border-2 border-teal-100 rounded-full flex items-center justify-center text-4xl text-teal-600 shadow-[0_10px_40px_-10px_rgba(20,184,166,0.3)] mb-6 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500">
                        1
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Create Account</h3>
                    <p className="text-gray-500 text-sm">Sign up for free and tell us about your child's learning goals.</p>
                </div>

                <div className="text-center group relative z-10">
                    <div
                        className="w-24 h-24 mx-auto bg-white border-2 border-amber-100 rounded-full flex items-center justify-center text-4xl text-amber-500 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] mb-6 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                        2
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Meet Mentor</h3>
                    <p className="text-gray-500 text-sm">Book a free trial session to find the perfect teacher match.</p>
                </div>

                <div className="text-center group relative z-10">
                    <div
                        className="w-24 h-24 mx-auto bg-white border-2 border-pink-100 rounded-full flex items-center justify-center text-4xl text-pink-500 shadow-[0_10px_40px_-10px_rgba(236,72,153,0.3)] mb-6 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all duration-500">
                        3
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Start Journey</h3>
                    <p className="text-gray-500 text-sm">Begin the structured curriculum and watch them bloom.</p>
                </div>
            </div>
        </div>
    </section>

    {/*  Cinematic Experience Section (Full Width Immersive)  */}
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-black z-20">
        {/*  User GIF Background (Full Screen Effect)  */}
        {/*  User GIF Background (Full Screen Effect)  */}
        <div className="absolute inset-0">
            {/*  High Quality GIF - Scale 105 to crop edge watermarks  */}
            <img src="/landing/That_edit_outside_202602061632.gif"
                className="w-full h-full object-cover opacity-100 scale-105" alt="Cinematic Graphic" />
            {/*  White fade at bottom to blend into light section  */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
        </div>

        {/*  Center Content  */}
        <div className="relative z-10 text-center px-6 max-w-5xl">
            <h2 className="text-5xl md:text-7xl font-serif text-white mb-4 drop-shadow-2xl tracking-tight opacity-95">
                Experience our World</h2>
            <p className="text-white/90 text-xl font-light tracking-[0.2em] uppercase drop-shadow-md">A Glimpse Inside</p>
        </div>
    </section>

    {/*  Mentors / Teacher Spotlight (Luxury Light Glass)  */}
    {/*  Mentors / Teacher Spotlight (Glass Cards)  */}
    <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div className="text-left">
                    <span className="text-amber-500 font-bold uppercase tracking-[0.2em] text-sm">Our
                        Guidance</span>
                    <h2 className="text-4xl font-serif text-gray-900 mt-2 drop-shadow-sm">Meet The Mentors</h2>
                </div>
                <button
                    className="px-6 py-3 border border-gray-200 glass-panel font-bold text-gray-600 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-200 transition-all flex items-center gap-2 shadow-sm">
                    View All Teachers <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
                </button>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
                {/*  Mentor 1  */}
                <div
                    className="group relative glass-panel p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center">
                    <div
                        className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-teal-50 group-hover:ring-teal-200 transition-all">
                        <img src="https://ui-avatars.com/api/?name=Ustadha+A&background=14b8a6&color=fff&size=200"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt="Teacher" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 mb-1">Ustadha Amina</h3>
                        <p className="text-teal-500 text-sm font-medium uppercase tracking-wider">Quran Specialist</p>
                    </div>
                    <button
                        className="mt-6 w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all">
                        <iconify-icon icon="solar:videocamera-record-bold"></iconify-icon>
                    </button>
                </div>

                {/*  Mentor 2  */}
                <div
                    className="group relative glass-panel p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center">
                    <div
                        className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-amber-50 group-hover:ring-amber-200 transition-all">
                        <img src="https://ui-avatars.com/api/?name=Ustadh+K&background=f59e0b&color=fff&size=200"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt="Teacher" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 mb-1">Ustadh Karim</h3>
                        <p className="text-amber-500 text-sm font-medium uppercase tracking-wider">Arabic Language</p>
                    </div>
                    <button
                        className="mt-6 w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <iconify-icon icon="solar:videocamera-record-bold"></iconify-icon>
                    </button>
                </div>

                {/*  Mentor 3  */}
                <div
                    className="group relative glass-panel p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col items-center text-center">
                    <div
                        className="w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-pink-50 group-hover:ring-pink-200 transition-all">
                        <img src="https://ui-avatars.com/api/?name=Ustadha+S&background=ec4899&color=fff&size=200"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt="Teacher" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-gray-800 mb-1">Ustadha Sarah</h3>
                        <p className="text-pink-500 text-sm font-medium uppercase tracking-wider">Islamic Studies</p>
                    </div>
                    <button
                        className="mt-6 w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all">
                        <iconify-icon icon="solar:videocamera-record-bold"></iconify-icon>
                    </button>
                </div>

                {/*  Mentor 4  */}
                <div
                    className="group relative bg-teal-900 rounded-[2rem] p-4 border border-teal-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col justify-center items-center text-center">
                    <div
                        className="w-20 h-20 bg-teal-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-700 transition-colors">
                        <iconify-icon icon="solar:arrow-right-bold" className="text-3xl text-teal-400"></iconify-icon>
                    </div>
                    <h3 className="font-bold text-xl text-white">Join the Team</h3>
                    <p className="text-teal-400 text-sm mt-2">Are you a qualified teacher?</p>
                    <button
                        className="mt-4 text-xs font-bold text-white uppercase tracking-wider border-b border-teal-500 pb-1">Apply
                        Now</button>
                </div>
            </div>
        </div>
    </section>

    {/*  Courses Section with Images  */}
    {/*  Courses Section (Glass Cards)  */}
    <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Our Curriculum</h2>
                <p className="text-gray-500 text-lg">Designed to be engaging, colorful, and spiritually uplifting.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/*  Course 1  */}
                <div
                    className="group glass-panel overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className="h-56 overflow-hidden relative">
                        <img src="/landing/hero-image.jpg"
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            alt="Quran" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <span
                            className="absolute bottom-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most
                            Popular</span>
                    </div>
                    <div className="p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Quran & Tajweed</h3>
                        <p className="text-gray-500 mb-6 leading-relaxed">Our flagship Hifz program designed for little
                            hearts. Kids learn to recite with proper Tajweed through interactive storytelling and
                            melodious practice.</p>
                        <button
                            className="w-full py-3 rounded-xl border-2 border-amber-100 text-amber-600 font-bold hover:bg-amber-50 transition-colors">View
                            Details</button>
                    </div>
                </div>

                {/*  Course 2  */}
                <div
                    className="group glass-panel overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className="h-56 overflow-hidden relative">
                        <img src="/landing/classroom.png"
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            alt="Islamic Studies" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                    <div className="p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Islamic Studies</h3>
                        <p className="text-gray-500 mb-6 leading-relaxed">A colorful journey through Seerah and Fiqh. We
                            turn complex topics into fun, relatable stories that build a strong moral foundation.</p>
                        <button
                            className="w-full py-3 rounded-xl border-2 border-teal-100 text-teal-600 font-bold hover:bg-teal-50 transition-colors">View
                            Details</button>
                    </div>
                </div>

                {/*  Course 3  */}
                <div
                    className="group glass-panel overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className="h-56 overflow-hidden relative">
                        <img src="/landing/garden.png"
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                            alt="Arabic" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                    <div className="p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">Arabic Basics</h3>
                        <p className="text-gray-500 mb-6 leading-relaxed">Unlock the language of the Quran. From alphabet
                            games to basic conversation, we make learning Arabic as natural as play.</p>
                        <button
                            className="w-full py-3 rounded-xl border-2 border-pink-100 text-pink-600 font-bold hover:bg-pink-50 transition-colors">View
                            Details</button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/*  Vision Section with CSS Gradient (No Image Reuse)  */}
    {/*  Vision Section (Light Heavenly Sky)  */}
    {/*  Vision Section (Transparent Glass)  */}
    <section className="py-32 relative flex items-center justify-center overflow-hidden">
        {/*  Floating Visuals  */}
        <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-[100px] animate-pulse">
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
            <div className="inline-block p-4 rounded-full glass-panel mb-8 animate-fade-up shadow-sm">
                <iconify-icon icon="solar:sun-2-bold" className="text-4xl text-amber-400 drop-shadow-sm"></iconify-icon>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif text-gray-800 mb-6 animate-fade-up delay-100">
                Cultivating Hearts,<br />Illuminating Minds
            </h2>
            <p className="text-xl text-gray-600 font-medium leading-relaxed animate-fade-up delay-200">
                We believe every child is a star waiting to shine. Our vision is to create a universe where Islamic
                values and modern education dance together in perfect harmony.
            </p>
        </div>
    </section>

    {/*  FAQ Section with Animated Accordion  */}
    {/*  FAQ Section with Animated Accordion  */}
    {/*  FAQ Section (Glass Accordion)  */}
    <section className="py-24 px-6 relative overflow-hidden">
        {/*  Decor: Amber decorative circle  */}
        <div
            className="absolute top-0 left-0 w-64 h-64 bg-amber-100 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2">
        </div>
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
                <span className="text-teal-600 font-bold uppercase tracking-wider text-sm">Common Questions</span>
                <h2 className="text-4xl font-extrabold text-gray-900 mt-2">Parents Ask Us</h2>
            </div>

            <div className="space-y-4">
                {/*  FAQ Item 1  */}
                <div className="group glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button 
                        className="w-full text-left px-8 py-6 flex justify-between items-center focus:outline-none">
                        <span className="font-bold text-lg text-gray-800">What age groups do you cater to?</span>
                        <div
                            className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 transition-transform duration-300 group-focus-within:rotate-180">
                            <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
                        </div>
                    </button>
                    <div className="max-h-0 overflow-hidden transition-all duration-500 ease-in-out">
                        <div className="px-8 pb-8 text-gray-500 leading-relaxed">
                            We welcome little learners from ages 4 to 12. Our curriculum is tailored to specific
                            developmental stages to ensure engagement and effective learning.
                        </div>
                    </div>
                </div>

                {/*  FAQ Item 2  */}
                <div className="group glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button 
                        className="w-full text-left px-8 py-6 flex justify-between items-center focus:outline-none">
                        <span className="font-bold text-lg text-gray-800">Are the classes live or pre-recorded?</span>
                        <div
                            className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 transition-transform duration-300 group-focus-within:rotate-180">
                            <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
                        </div>
                    </button>
                    <div className="max-h-0 overflow-hidden transition-all duration-500 ease-in-out">
                        <div className="px-8 pb-8 text-gray-500 leading-relaxed">
                            All our core sessions are 100% LIVE and interactive! We believe in real-time connection
                            between the teacher and student. Recordings are available for review.
                        </div>
                    </div>
                </div>

                {/*  FAQ Item 3  */}
                <div className="group glass-panel rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button 
                        className="w-full text-left px-8 py-6 flex justify-between items-center focus:outline-none">
                        <span className="font-bold text-lg text-gray-800">Do you offer a free trial?</span>
                        <div
                            className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 transition-transform duration-300 group-focus-within:rotate-180">
                            <iconify-icon icon="solar:alt-arrow-down-linear"></iconify-icon>
                        </div>
                    </button>
                    <div className="max-h-0 overflow-hidden transition-all duration-500 ease-in-out">
                        <div className="px-8 pb-8 text-gray-500 leading-relaxed">
                            Absolutely! You can book a complimentary 30-minute discovery session to meet a mentor and
                            see if we're the right fit for your family.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/*  Light Luxury Calendar Section (Butter Transition Start)  */}
    {/*  Light Luxury Calendar Section (Butter Transition Start)  */}
    {/*  Light Luxury Calendar Section (Glass)  */}
    <section className="py-24 px-6 relative overflow-hidden">
        {/*  Decorative Frame Animation  */}
        <div className="absolute inset-0 border-[20px] border-white/20 pointer-events-none z-20"></div>

        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-fade-up">
                <span className="text-amber-500 font-bold uppercase tracking-[0.2em] text-xs mb-2 block">Your
                    Schedule</span>
                <h2 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">Seamless Mentorship</h2>
                <p className="text-gray-500 text-lg font-light max-w-2xl mx-auto">Book sessions with our qualified ustadhs
                    in a few simple clicks.</p>
            </div>

            <div className="glass-panel overflow-hidden flex flex-col md:flex-row min-h-[550px] animate-fade-up delay-200">
                {/*  Sidebar: Mentors  */}
                <div className="w-full md:w-1/3 border-r border-white/30 p-8 bg-white/30 backdrop-blur-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">Select Mentor</h3>
                    <div className="space-y-4">
                        {/*  Active Teacher  */}
                        <div className="relative group cursor-pointer">
                            <div
                                className="absolute inset-0 bg-amber-50 rounded-2xl scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                            </div>
                            <div
                                className="relative flex items-center gap-4 p-4 rounded-2xl border border-amber-200 bg-white/80 shadow-sm">
                                <img src="/landing/hero-image.jpg"
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                    alt="Sarah" />
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Ustadha Sarah</p>
                                    <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">Quran &
                                        Tajweed</p>
                                </div>
                                <div
                                    className="ml-auto w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                    <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                                </div>
                            </div>
                        </div>

                        {/*  Inactive Teacher  */}
                        <div
                            className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-white/40 cursor-pointer transition-colors opacity-70 hover:opacity-100 grayscale hover:grayscale-0">
                            <div
                                className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500 font-bold border-2 border-white">
                                FA</div>
                            <div>
                                <p className="text-sm font-bold text-gray-700">Ustadha Fatima</p>
                                <p className="text-xs text-gray-400">Islamic History</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/*  Calendar Area  */}
                <div className="w-full md:w-2/3 p-10 relative">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="font-serif text-2xl text-gray-800">March 2026</h3>
                            <p className="text-xs text-gray-400 mt-1">Timezone: Asia/Dubai (GMT+4)</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all"><iconify-icon
                                    icon="solar:alt-arrow-left-linear" width="20"></iconify-icon></button>
                            <button
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 transition-all"><iconify-icon
                                    icon="solar:alt-arrow-right-linear" width="20"></iconify-icon></button>
                        </div>
                    </div>

                    {/*  Modern Grid  */}
                    <div className="grid grid-cols-7 gap-4 mb-4 text-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mon</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tue</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wed</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thu</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fri</span>
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Sat</span>
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Sun</span>
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                        <div className="h-12"></div>
                        <div className="h-12"></div>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">1</span></button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">2</span></button>
                        {/*  Selected Day  */}
                        <button
                            className="calendar-day group relative bg-gray-900 rounded-xl shadow-lg ring-4 ring-gray-100"><span
                                className="text-sm text-white font-bold">3</span></button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">4</span></button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">5</span></button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-400 font-medium">6</span></button>

                        {/*  Active Day with Gold  */}
                        <button
                            className="calendar-day-active group relative rounded-xl shadow-lg transform scale-110 z-10">
                            <span className="text-sm text-white font-bold">7</span>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full">
                            </div>
                        </button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">8</span></button>
                        <button className="calendar-day group relative hover:bg-white/50 rounded-xl transition-colors"><span
                                className="text-sm text-gray-600 font-medium">9</span></button>
                        <button className="calendar-day group relative bg-gray-900 rounded-xl shadow-lg"><span
                                className="text-sm text-white font-bold">10</span></button>
                    </div>

                    {/*  Time Slots  */}
                    <div className="mt-10 pt-8 border-t border-gray-100/50">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Slots</p>
                            <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-1 rounded-md font-bold">3 Spots
                                Left</span>
                        </div>

                        <div className="flex gap-4">
                            <label className="cursor-pointer group">
                                <input type="radio" name="time" className="peer hidden" />
                                <div
                                    className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium peer-checked:bg-gray-900 peer-checked:text-white peer-checked:border-gray-900 hover:border-gray-300 transition-all duration-300 shadow-sm">
                                    4:00 PM</div>
                            </label>

                            <label className="cursor-pointer group">
                                <input type="radio" name="time" className="peer hidden" defaultChecked />
                                <div
                                    className="px-6 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold peer-checked:bg-amber-500 peer-checked:text-white peer-checked:border-transparent transition-all duration-300 shadow-md transform scale-105">
                                    5:30 PM</div>
                            </label>

                            <label className="cursor-pointer group">
                                <input type="radio" name="time" className="peer hidden" />
                                <div
                                    className="px-6 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium peer-checked:bg-gray-900 peer-checked:text-white peer-checked:border-gray-900 hover:border-gray-300 transition-all duration-300 shadow-sm">
                                    7:00 PM</div>
                            </label>
                        </div>
                    </div>

                    <button
                        className="absolute bottom-8 right-8 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2 group">
                        Confirm Booking
                        <iconify-icon icon="solar:arrow-right-linear"
                            className="group-hover:translate-x-1 transition-transform"></iconify-icon>
                    </button>
                </div>
            </div>
        </div>
    </section>

    {/*  Testimonials Section (Butter Transition Middle)  */}
    {/*  Testimonials Section (Glass Cards)  */}
    <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <span className="text-teal-600 font-bold uppercase tracking-wider text-sm">Community Love</span>
                <h2 className="text-4xl font-extrabold text-gray-900 mt-2">What Parents Say</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/*  Review 1  */}
                <div className="glass-panel p-8 relative">
                    <iconify-icon icon="solar:quote-up-square-bold"
                        className="text-4xl text-amber-200/80 absolute top-8 right-8"></iconify-icon>
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-600">
                            SM</div>
                        <div>
                            <h4 className="font-bold text-gray-900">Sarah M.</h4>
                            <p className="text-xs text-gray-500">London, UK</p>
                        </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">"My daughter used to struggle with Arabic, but now she
                        sings the alphabet! The teachers are so patient and kind."</p>
                    <div className="flex gap-1 text-amber-400 mt-4 text-sm">
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                    </div>
                </div>

                {/*  Review 2  */}
                <div className="glass-panel p-8 relative shadow-2xl transform md:-translate-y-4 border-teal-200">
                    <iconify-icon icon="solar:quote-up-square-bold"
                        className="text-4xl text-teal-200 absolute top-8 right-8"></iconify-icon>
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-600">
                            YA</div>
                        <div>
                            <h4 className="font-bold text-gray-900">Yusuf A.</h4>
                            <p className="text-xs text-gray-500">Toronto, Canada</p>
                        </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">"The interactive platform is a game-changer. It feels like
                        a high-end app but with real spiritual value. Highly recommended!"</p>
                    <div className="flex gap-1 text-amber-400 mt-4 text-sm">
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                    </div>
                </div>

                {/*  Review 3  */}
                <div className="glass-panel p-8 relative">
                    <iconify-icon icon="solar:quote-up-square-bold"
                        className="text-4xl text-pink-200/80 absolute top-8 right-8"></iconify-icon>
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-600">
                            FK</div>
                        <div>
                            <h4 className="font-bold text-gray-900">Fatima K.</h4>
                            <p className="text-xs text-gray-500">Dubai, UAE</p>
                        </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">"Finally, an Islamic school that understands modern design
                        and user experience. My son loves the animations!"</p>
                    <div className="flex gap-1 text-amber-400 mt-4 text-sm">
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                        <iconify-icon icon="solar:star-bold"></iconify-icon>
                    </div>
                </div>
            </div>
        </div>
    </section>

    {/*  Newsletter CTA (Light Theme)  */}
    {/*  Newsletter CTA (Transparent Glass)  */}
    <section className="py-24 px-6 relative overflow-hidden">
        {/*  Decorative Floating Icons  */}
        <iconify-icon icon="solar:star-bold"
            className="absolute top-20 left-10 text-4xl text-amber-300 opacity-50 animate-bounce"
            style={{ animationDuration: '3s' }}></iconify-icon>
        <iconify-icon icon="solar:star-bold"
            className="absolute bottom-20 right-10 text-3xl text-pink-300 opacity-50 animate-bounce"
            style={{ animationDuration: '4s' }}></iconify-icon>

        <div className="max-w-4xl mx-auto text-center relative z-10 glass-panel p-16">
            <div
                className="inline-block p-4 rounded-3xl bg-white/60 backdrop-blur-md border border-white/60 mb-8 shadow-sm">
                <div
                    className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg transform rotate-3">
                    <iconify-icon icon="solar:letter-bold-duotone"></iconify-icon>
                </div>
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold text-gray-800 mb-6 drop-shadow-sm">
                Join Our Little <span
                    className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">Community</span>
            </h2>

            <p className="text-gray-600 text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                Get free printable coloring pages, Hifz tips, and exclusive updates delivered straight to your inbox.
            </p>

            <form className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto p-2 rounded-2xl">
                <div className="relative flex-1">
                    <iconify-icon icon="solar:letter-linear"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></iconify-icon>
                    <input type="email" placeholder="Your email address"
                        className="w-full pl-12 pr-6 py-4 rounded-xl bg-white border border-gray-100 focus:border-amber-200 outline-none text-gray-800 placeholder-gray-400 transition-all font-medium" />
                </div>
                <button
                    className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-teal-900 font-bold rounded-xl hover:from-amber-300 hover:to-amber-400 hover:scale-[1.02] transition-all shadow-lg flex items-center justify-center gap-2 group">
                    Subscribe
                    <iconify-icon icon="solar:plain-3-bold"
                        className="group-hover:translate-x-1 transition-transform"></iconify-icon>
                </button>
            </form>

            <div className="mt-8 flex justify-center gap-6 text-gray-400 text-xs font-bold uppercase tracking-widest">
                <span className="flex items-center gap-2"><iconify-icon icon="solar:shield-check-bold"></iconify-icon> No
                    Spam</span>
                <span className="flex items-center gap-2"><iconify-icon icon="solar:heart-bold"></iconify-icon> 100%
                    Free</span>
                <span className="flex items-center gap-2"><iconify-icon icon="solar:close-circle-bold"></iconify-icon>
                    Unsubscribe Anytime</span>
            </div>
        </div>
    </section>

    {/*  Footer Section (Teal Background)  */}
    <footer
        className="bg-teal-50 text-gray-700 py-20 px-6 relative overflow-hidden border-t border-teal-100 mt-12 mx-4 mb-4 rounded-3xl shadow-lg">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 relative z-10">
            <div>
                <div className="flex items-center gap-2 font-bold text-2xl tracking-tight mb-8">
                    <span className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white shadow-md">
                        <iconify-icon icon="solar:stars-minimalistic-bold" width="18"></iconify-icon>
                    </span>
                    Little Muslimah Academy
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-8">
                    <span
                        className="block bg-gradient-to-r from-teal-600 to-amber-500 bg-clip-text text-transparent animate-pulse">Begin
                        Your Child’s</span>
                    <span className="block text-gray-800">Journey With Purpose.</span>
                </h2>

                <Link
                    href="/sign-up"
                    className="inline-flex items-center px-8 py-4 bg-teal-600 text-white rounded-full font-bold shadow-lg hover:bg-teal-500 transition-colors">
                    Enroll Today
                </Link>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-teal-100 shadow-sm flex flex-col justify-between">
                <ul className="space-y-4 font-medium text-gray-600">
                    <li><a href="#" className="hover:text-amber-500 transition-colors flex items-center gap-2"><iconify-icon
                                icon="solar:arrow-right-linear" className="text-xs"></iconify-icon> Privacy Policy</a></li>
                    <li><a href="#" className="hover:text-amber-500 transition-colors flex items-center gap-2"><iconify-icon
                                icon="solar:arrow-right-linear" className="text-xs"></iconify-icon> Terms & Conditions</a>
                    </li>
                    <li><a href="#" className="hover:text-amber-500 transition-colors flex items-center gap-2"><iconify-icon
                                icon="solar:arrow-right-linear" className="text-xs"></iconify-icon> Contact Support</a></li>
                </ul>

                <div className="mt-8 pt-8 border-t border-gray-100 text-sm text-gray-500">
                    © 2026 Little Muslimah Academy. All rights reserved.
                </div>
            </div>
        </div>
    </footer>

    {/*  Floating Floating Action Button (FAB)  */}
    <a href="#"
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-[#25D366] text-white rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] flex items-center justify-center hover:scale-110 hover:shadow-[0_6px_25px_rgba(37,211,102,0.6)] transition-all animate-bounce"
        style={{ animationDuration: '3s' }}>
        <iconify-icon icon="ic:baseline-whatsapp" className="text-3xl"></iconify-icon>
        <span
            className="absolute right-full mr-4 bg-white text-gray-800 px-3 py-1 rounded-lg text-xs font-bold shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Chat
            with us</span>
    </a>

    

      </div>
      

    </>
  );
}
