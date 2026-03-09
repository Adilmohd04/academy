'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  GraduationCap, 
  Users, 
  Star, 
  Heart, 
  Globe, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  PlayCircle,
  Menu,
  X,
  Sparkles,
  Scroll,
  MessageCircle,
  Phone
} from 'lucide-react';
import { 
  IslamicPatternBackground, 
  IslamicBorder, 
  GeometricStarPattern,
  MashrabiyaPattern
} from '@/components/ui/IslamicPatterns';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { IslamicCard, IslamicStatCard, IslamicActionCard } from '@/components/ui/IslamicCards';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const stats = [
    { label: "Active Students", value: "500+", icon: Users, color: "text-islamic-primary-600", bg: "bg-white/80" },
    { label: "Expert Teachers", value: "45+", icon: GraduationCap, color: "text-islamic-gold-600", bg: "bg-white/80" },
    { label: "Courses Completed", value: "1.2k", icon: BookOpen, color: "text-islamic-emerald-600", bg: "bg-white/80" },
    { label: "5-Star Reviews", value: "4.9", icon: Star, color: "text-amber-500", bg: "bg-white/80" },
  ];

  const features = [
    {
      title: "Quranic Studies",
      description: "Master Tajweed and memorization with certified Huffaz who nurture a love for the Holy Quran.",
      icon: BookOpen,
      gradient: "from-[#0F4C3A] to-[#10B981]"
    },
    {
      title: "Arabic Language",
      description: "Learn the language of the Quran with our immersive curriculum designed for non-native speakers.",
      icon: Globe,
      gradient: "from-[#D4AF37] to-[#F59E0B]"
    },
    {
      title: "Islamic Studies",
      description: "Comprehensive education in Fiqh, Seerah, and Aqeedah tailored for young minds.",
      icon: Scroll,
      gradient: "from-[#8B6914] to-[#B8941E]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-islamic-primary-950 font-sans overflow-x-hidden selection:bg-islamic-gold-200">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-islamic-gold-200/30 supports-[backdrop-filter]:bg-[#FDFBF7]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-islamic-primary-600 rotate-45 rounded-lg opacity-20"></div>
                <div className="absolute inset-0 bg-islamic-gold-500 rotate-12 rounded-lg opacity-20"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-islamic-primary-700 to-islamic-primary-900 rounded-lg flex items-center justify-center shadow-lg border border-islamic-gold-400/30">
                  <span className="font-arabic text-xl text-islamic-gold-100 font-bold pt-1">IA</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-arabic text-2xl font-bold text-islamic-primary-900 leading-none tracking-tight">Islamic Academy</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-islamic-gold-600 font-medium mt-1">Est. 2024</span>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              {['Programs', 'About', 'Tuition'].map((item) => (
                <Link key={item} href={`#${item.toLowerCase()}`} className="relative px-4 py-2 text-islamic-primary-800 hover:text-islamic-primary-600 font-medium transition-colors group">
                  {item}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-islamic-gold-400 transform scale-x-0 transition-transform group-hover:scale-x-100 origin-left"></span>
                </Link>
              ))}
              
              <div className="flex items-center gap-3 pl-6 ml-2 border-l border-islamic-gold-200">
                <Link href="/sign-in">
                  <button className="text-islamic-primary-700 font-bold hover:text-islamic-primary-900 px-5 py-2.5 transition-colors">
                    Log In
                  </button>
                </Link>
                <Link href="/sign-up">
                  <IslamicButton variant="primary" className="shadow-lg shadow-islamic-primary-200/50 hover:shadow-islamic-primary-300/50 hover:-translate-y-0.5 transition-all">
                    Get Started
                  </IslamicButton>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-islamic-primary-800 p-2">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden bg-[#FDFBF7] border-b border-islamic-gold-200 px-4 py-6 shadow-xl"
          >
            <div className="space-y-4">
              <Link href="#programs" className="block text-lg font-medium text-islamic-primary-900 p-2">Programs</Link>
              <Link href="#about" className="block text-lg font-medium text-islamic-primary-900 p-2">About</Link>
              <Link href="#tuition" className="block text-lg font-medium text-islamic-primary-900 p-2">Tuition</Link>
              <div className="pt-4 grid grid-cols-2 gap-4">
                <Link href="/sign-in">
                  <button className="w-full py-3 text-islamic-primary-700 font-bold border border-islamic-primary-200 rounded-xl">Log In</button>
                </Link>
                <Link href="/sign-up">
                  <IslamicButton variant="primary" className="w-full justify-center py-3">Get Started</IslamicButton>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-br from-[#F8F6F3] via-white to-[#FFF9F0]">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-islamic-gold-200/40 to-islamic-primary-200/40 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-islamic-emerald-200/30 to-islamic-gold-100/30 rounded-full blur-3xl" 
        />
        
        <IslamicPatternBackground pattern="star" opacity={0.04} className="absolute inset-0" >
           <div />
        </IslamicPatternBackground>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >
              {/* Animated Badge */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 pl-1 pr-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-islamic-gold-200 text-islamic-primary-800 text-sm font-medium mb-8 shadow-lg hover:shadow-xl transition-all cursor-default"
              >
                <motion.span 
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-gradient-to-br from-islamic-gold-400 to-islamic-gold-600 text-white p-1.5 rounded-full shadow-md"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                </motion.span>
                <span>Formerly Little Muslima Academy</span>
              </motion.div>

              <h1 className="font-arabic text-6xl md:text-7xl lg:text-8xl font-bold text-islamic-primary-950 mb-6 leading-[1.1]">
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-islamic-gold-500 to-islamic-gold-700 text-2xl md:text-3xl font-sans font-medium uppercase tracking-[0.3em] mb-4 pl-1"
                >
                  Excellence In
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="block"
                >
                  Islamic{' '}
                </motion.span>
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative inline-block"
                >
                  Academy
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-islamic-gold-400 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
                      d="M0 5 Q 50 10 100 5" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      fill="none" 
                    />
                  </svg>
                </motion.span>
              </h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-islamic-primary-700/80 mb-10 leading-relaxed max-w-lg border-l-4 border-islamic-gold-400 pl-6"
              >
                Nurturing hearts and minds with authentic Islamic knowledge. Join a global community dedicated to faith, excellence, and spiritual growth.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/sign-up">
                  <motion.button 
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative px-8 py-4 bg-gradient-to-r from-islamic-primary-900 via-islamic-primary-800 to-islamic-emerald-900 text-white rounded-xl font-bold text-lg shadow-2xl overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Your Journey 
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </span>
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-islamic-emerald-700 to-islamic-primary-700"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "0%" }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </Link>
                <Link href="#programs">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 bg-white/80 backdrop-blur-sm text-islamic-primary-900 border-2 border-islamic-sand-200 rounded-xl font-bold text-lg hover:border-islamic-gold-400 hover:bg-white transition-all shadow-lg"
                  >
                    Explore Courses
                  </motion.button>
                </Link>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-12 flex items-center gap-4 text-sm font-medium text-islamic-primary-600"
              >
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.9 + (i * 0.1) }}
                      whileHover={{ scale: 1.2, zIndex: 10 }}
                      className="w-10 h-10 rounded-full border-3 border-white bg-gradient-to-br from-islamic-sand-200 to-islamic-gold-200 flex items-center justify-center text-xs font-bold text-islamic-primary-800 shadow-md"
                    >
                      {String.fromCharCode(64+i)}
                    </motion.div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex text-amber-500">
                    {[1,2,3,4,5].map(i => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 1 + (i * 0.05) }}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <span>Trusted by 500+ Families</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Visual - Luxury Framed Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block h-[600px]"
            >
              {/* Main Luxury Card with Image Frame */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white rounded-[3rem] shadow-2xl overflow-hidden p-3"
              >
                {/* Ornate Golden Frame */}
                <div className="absolute inset-0 border-8 border-white rounded-[3rem] z-10 pointer-events-none"></div>
                <div className="absolute inset-0 border-4 border-islamic-gold-300/60 rounded-[2.5rem] z-20 pointer-events-none m-2"></div>
                
                {/* Image Background with Gradient Overlay */}
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-islamic-primary-900/90 via-islamic-primary-800/80 to-islamic-emerald-900/90 z-10"></div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80')] bg-cover bg-center"
                  />
                  
                  {/* Islamic Pattern Overlay */}
                  <IslamicPatternBackground pattern="mashrabiya" color="#ffffff" opacity={0.12} className="absolute inset-0 z-20">
                    <div className="w-full h-full" />
                  </IslamicPatternBackground>
                  
                  {/* Floating Content Inside Frame */}
                  <div className="absolute inset-0 z-30 p-10 flex flex-col justify-end">
                     {/* Feature Card 1 */}
                     <motion.div 
                       initial={{ y: 20, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       transition={{ delay: 0.5 }}
                       whileHover={{ y: -5 }}
                       className="bg-white/15 backdrop-blur-xl border-2 border-white/30 p-6 rounded-2xl mb-6 shadow-xl"
                     >
                        <div className="flex items-center gap-4 mb-3">
                          <motion.div 
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="p-3 bg-gradient-to-br from-islamic-gold-400 to-islamic-gold-600 rounded-2xl text-white shadow-lg"
                          >
                            <Sparkles className="w-6 h-6" />
                          </motion.div>
                          <div>
                            <p className="font-bold text-xl text-white">Interactive Learning</p>
                            <p className="text-white/90 text-sm">Live sessions with expert tutors</p>
                          </div>
                        </div>
                     </motion.div>
                     
                     {/* Stats Row */}
                     <div className="flex gap-4">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.7 }}
                          whileHover={{ scale: 1.05 }}
                          className="flex-1 bg-white/20 backdrop-blur-xl border-2 border-emerald-400/40 p-5 rounded-2xl text-center shadow-xl"
                        >
                          <p className="text-3xl font-bold font-arabic text-white">100%</p>
                          <p className="text-xs uppercase tracking-wider text-emerald-100 font-semibold mt-1">Certified</p>
                        </motion.div>
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.9 }}
                          whileHover={{ scale: 1.05 }}
                          className="flex-1 bg-white/20 backdrop-blur-xl border-2 border-islamic-gold-400/40 p-5 rounded-2xl text-center shadow-xl"
                        >
                          <p className="text-3xl font-bold font-arabic text-white">24/7</p>
                          <p className="text-xs uppercase tracking-wider text-gold-100 font-semibold mt-1">Access</p>
                        </motion.div>
                     </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Info Card */}
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                whileHover={{ scale: 1.05, rotate: 2 }}
                className="absolute -right-12 top-20 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl z-40 max-w-[220px] border-2 border-islamic-sand-100"
              >
                 <div className="flex items-center gap-3 mb-2">
                    <motion.div 
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-br from-islamic-gold-400 to-islamic-gold-600 flex items-center justify-center shadow-lg"
                    >
                       <Globe className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                       <p className="font-bold text-islamic-primary-900 text-sm">Global Community</p>
                    </div>
                 </div>
                 <p className="text-xs text-islamic-primary-600 font-medium">Students from 20+ countries learning together</p>
              </motion.div>

              {/* Decorative Floating Element */}
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, 5, 0, -5, 0]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 bottom-32 w-24 h-24 bg-gradient-to-br from-islamic-emerald-400 to-islamic-emerald-600 rounded-full opacity-20 blur-xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Decorative Transition with Parallax */}
      <motion.div 
        style={{ 
          backgroundImage: "url('https://www.transparenttextures.com/patterns/arabesque.png')",
          backgroundAttachment: "fixed"
        }}
        className="h-20 opacity-10 relative overflow-hidden"
      >
        <motion.div
          animate={{ x: [-100, 100] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-islamic-gold-200/30 to-transparent"
        />
      </motion.div>

      {/* Stats Section - Luxury Floating Cards */}
      <section className="py-12 relative -mt-20 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: index * 0.15,
                  duration: 0.6,
                  type: "spring",
                  stiffness: 100
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  y: -8,
                  scale: 1.03,
                  transition: { duration: 0.3 }
                }}
                className="bg-gradient-to-br from-white via-white to-islamic-sand-50/30 rounded-3xl p-6 shadow-2xl border-2 border-white hover:border-islamic-gold-300/50 transition-all backdrop-blur-sm group cursor-default"
              >
                <motion.div 
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-${stat.bg} flex items-center justify-center mb-4 shadow-lg border-2 border-islamic-sand-100 group-hover:shadow-xl transition-shadow`}
                >
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </motion.div>
                <motion.h3 
                  initial={{ scale: 1 }}
                  whileInView={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                  className="text-4xl font-bold font-arabic text-transparent bg-clip-text bg-gradient-to-br from-islamic-primary-900 to-islamic-primary-700 mb-1"
                >
                  {stat.value}
                </motion.h3>
                <p className="text-islamic-primary-500 font-semibold uppercase tracking-wider text-xs">{stat.label}</p>
                
                {/* Decorative Corner Accent */}
                <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-islamic-gold-300/40 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Luxury Cards with Image Frames */}
      <section id="programs" className="py-24 relative bg-gradient-to-b from-white via-[#FDFBF7] to-white overflow-hidden">
        <IslamicPatternBackground pattern="arabesque" opacity={0.02} className="absolute inset-0" >
           <div />
        </IslamicPatternBackground>

        {/* Floating Decorative Elements */}
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-10 w-32 h-32 border-2 border-islamic-gold-200/30 rounded-full"
        />
        <motion.div
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -180, -360]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-10 w-40 h-40 border-2 border-islamic-primary-200/20 rounded-full"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <motion.h2 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="font-arabic text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-islamic-primary-900 via-islamic-primary-800 to-islamic-emerald-900 mb-6 relative inline-block"
            >
              Our Educational Programs
              <motion.span 
                initial={{ width: 0 }}
                whileInView={{ width: "6rem" }}
                transition={{ duration: 1, delay: 0.3 }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-1.5 bg-gradient-to-r from-islamic-gold-400 to-islamic-gold-600 rounded-full shadow-lg"
              />
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-islamic-primary-600/80 max-w-2xl mx-auto mt-8"
            >
              Designed to build a strong foundation in faith and knowledge through structured, interactive learning.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotateY: -20 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ 
                  delay: index * 0.2,
                  duration: 0.8,
                  type: "spring"
                }}
                viewport={{ once: true }}
                className="group relative h-full perspective-1000"
              >
                {/* Luxury Framed Card */}
                <motion.div
                  whileHover={{ 
                    y: -10,
                    rotateY: 5,
                    scale: 1.02
                  }}
                  transition={{ duration: 0.4 }}
                  className="relative h-full"
                >
                  {/* Outer Gold Frame */}
                  <div className="absolute inset-0 bg-gradient-to-br from-islamic-gold-200/50 via-white to-islamic-sand-100/50 rounded-[2.5rem] shadow-2xl border-4 border-white p-1">
                    {/* Inner Shadow Frame */}
                    <div className="absolute inset-2 border-2 border-islamic-gold-300/30 rounded-[2.2rem]" />
                  </div>
                  
                  {/* Main Content Card */}
                  <div className="relative h-full bg-white/95 backdrop-blur-sm rounded-[2.5rem] p-8 m-1 flex flex-col overflow-hidden">
                    {/* Decorative Corner Pattern */}
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                      <IslamicPatternBackground pattern="star" opacity={1} color="currentColor" className="text-islamic-gold-500" >
                        <div className="w-full h-full" />
                      </IslamicPatternBackground>
                    </div>
                    
                    {/* Icon with Animated Glow */}
                    <motion.div 
                      whileHover={{ 
                        scale: 1.15,
                        rotate: [0, -10, 10, 0]
                      }}
                      transition={{ duration: 0.5 }}
                      className="relative mb-8 w-fit"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} blur-xl opacity-50 rounded-2xl`} />
                      <div className={`relative w-18 h-18 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white shadow-xl border-3 border-white p-4`}>
                        <feature.icon className="w-10 h-10" />
                      </div>
                    </motion.div>
                    
                    <h3 className="font-arabic text-2xl font-bold text-islamic-primary-900 mb-4 relative z-10">{feature.title}</h3>
                    <p className="text-islamic-primary-600 leading-relaxed mb-8 flex-grow relative z-10">
                      {feature.description}
                    </p>
                    
                    {/* Animated Button */}
                    <div className="pt-6 border-t border-islamic-sand-200/60 relative z-10">
                      <motion.button 
                        whileHover={{ x: 5 }}
                        className="text-transparent bg-clip-text

 bg-gradient-to-r from-islamic-gold-600 to-islamic-gold-700 font-bold flex items-center gap-2 group-hover:gap-4 transition-all"
                      >
                        Learn More 
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="w-5 h-5 text-islamic-gold-600" />
                        </motion.div>
                      </motion.button>
                    </div>
                    
                    {/* Shimmer Effect on Hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"
                    />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Large Feature Block */}
      <section id="about" className="py-24 bg-[#0F4C3A] relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10">
           <MashrabiyaPattern color="#ffffff" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="font-arabic text-5xl md:text-6xl font-bold mb-8 leading-tight">
                    Why Parents Trust <br/>
                    <span className="text-islamic-gold-400">Islamic Academy</span>
                 </h2>
                 <p className="text-islamic-primary-100 text-lg leading-relaxed mb-10">
                    We understand that your child&apos;s spiritual journey is precious. That&apos;s why we&apos;ve built an ecosystem that combines traditional values with modern educational technology.
                 </p>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[
                      { title: "Expert Teachers", desc: "Qualified from top Islamic universities" },
                      { title: "Safe Environment", desc: "Monitored, secure online classrooms" },
                      { title: "Flexible Schedule", desc: "Classes that fit your family's routine" },
                      { title: "Progress Tracking", desc: "Detailed reports on your child's growth" }
                    ].map((item, i) => (
                      <div key={i} className="bg-islamic-primary-800/50 backdrop-blur-sm p-6 rounded-2xl border border-islamic-primary-700/50 hover:bg-islamic-primary-800 transition-colors">
                        <h4 className="font-bold text-islamic-gold-400 mb-2">{item.title}</h4>
                        <p className="text-sm text-islamic-primary-200">{item.desc}</p>
                      </div>
                    ))}
                 </div>

                 <div className="mt-12">
                    <Link href="/sign-up">
                      <IslamicButton variant="gold" size="lg" className="px-10">Join Our Community</IslamicButton>
                    </Link>
                 </div>
              </div>

              <div className="relative">
                 {/* Abstract Composition */}
                 <div className="relative h-[600px] w-full">
                    <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-islamic-sand-200 rounded-[3rem] overflow-hidden">
                       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-multiply opacity-40"></div>
                       <div className="absolute inset-0 bg-gradient-to-br from-islamic-sand-200/80 to-transparent"></div>
                       <div className="absolute bottom-8 left-8 right-8">
                          <p className="font-arabic text-4xl text-islamic-primary-900 font-bold mb-2">Knowledge is Light</p>
                          <p className="text-islamic-primary-700">Empowering the next generation</p>
                       </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-islamic-gold-500 rounded-[3rem] p-1 shadow-2xl">
                       <div className="w-full h-full border-2 border-white/30 rounded-[2.8rem] relative overflow-hidden bg-islamic-gold-500">
                          <IslamicPatternBackground pattern="zellige" opacity={0.1} color="#ffffff" className="w-full h-full flex items-center justify-center p-8 text-center">
                             <div>
                                <h3 className="font-arabic text-3xl font-bold text-islamic-primary-900 mb-4">Start Today</h3>
                                <p className="text-islamic-primary-800 mb-6 font-medium">Get a free trial session for your child</p>
                                <button className="bg-islamic-primary-900 text-white px-6 py-2 rounded-full text-sm font-bold">Book Free Trial</button>
                             </div>
                          </IslamicPatternBackground>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#FDFBF7] relative">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
               <h2 className="font-arabic text-4xl font-bold text-islamic-primary-900">What Our Families Say</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[
                 {
                   text: "We tried many platforms, but this is the only one where my son actually looks forward to his Quran class. The teacher is amazing.",
                   name: "Aisha M.",
                   loc: "London, UK",
                   color: "bg-rose-50 border-rose-100"
                 },
                 {
                   text: "The structured curriculum helps me track my daughter's progress. I love the feedback reports after every session.",
                   name: "Karim S.",
                   loc: "Toronto, Canada",
                   color: "bg-emerald-50 border-emerald-100"
                 },
                 {
                   text: "Beautiful interface, easy to use, and most importantly, authentic knowledge taught with wisdom and kindness.",
                   name: "Zainab A.",
                   loc: "Dubai, UAE",
                   color: "bg-amber-50 border-amber-100"
                 }
               ].map((t, i) => (
                  <div key={i} className={`p-8 rounded-2xl border ${t.color} relative group hover:-translate-y-1 transition-transform duration-300`}>
                     <div className="absolute -top-4 left-8 bg-white p-2 rounded-full border border-islamic-sand-200 shadow-sm">
                        <MessageCircle className="w-6 h-6 text-islamic-gold-500" />
                     </div>
                     <div className="flex gap-1 mb-4 mt-2">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                     </div>
                     <p className="text-islamic-primary-800 mb-6 leading-relaxed italic">&quot;{t.text}&quot;</p>
                     <div>
                        <p className="font-bold text-islamic-primary-900">{t.name}</p>
                        <p className="text-sm text-islamic-primary-500">{t.loc}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
         <div className="absolute inset-0 bg-islamic-gold-500">
            <GeometricStarPattern color="#000000" opacity={0.05} />
         </div>
         <div className="max-w-5xl mx-auto px-4 relative z-10 text-center text-islamic-primary-950">
            <h2 className="font-arabic text-5xl md:text-6xl font-bold mb-8">Begin Your Journey to Knowledge</h2>
            <p className="text-xl font-medium max-w-2xl mx-auto mb-10 opacity-90">
               &quot;Seek knowledge from the cradle to the grave.&quot;
            </p>
            <div className="bg-white p-2 rounded-2xl shadow-2xl inline-flex flex-col sm:flex-row gap-2">
               <Link href="/sign-up">
                  <button className="px-10 py-4 bg-islamic-primary-900 text-white rounded-xl font-bold text-lg hover:bg-islamic-primary-800 transition-colors w-full sm:w-auto">
                     Enroll Now
                  </button>
               </Link>
               <Link href="/contact">
                  <button className="px-10 py-4 bg-islamic-sand-100 text-islamic-primary-900 rounded-xl font-bold text-lg hover:bg-islamic-sand-200 transition-colors w-full sm:w-auto">
                     Contact Us
                  </button>
               </Link>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A202C] text-slate-300 pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-islamic-gold-500 rounded-lg flex items-center justify-center text-islamic-primary-900 font-bold font-arabic text-xl">IA</div>
                 <span className="font-arabic text-2xl font-bold text-white">Islamic Academy</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">
                Providing accessible, high-quality Islamic education to students worldwide. Building the leaders of tomorrow on the foundation of faith.
              </p>
              <div className="flex gap-4">
                 {/* Social Icons Placeholder */}
                 <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-islamic-gold-500 hover:text-islamic-primary-900 transition-colors cursor-pointer"><Globe className="w-5 h-5" /></div>
                 <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-islamic-gold-500 hover:text-islamic-primary-900 transition-colors cursor-pointer"><MessageCircle className="w-5 h-5" /></div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-white text-lg mb-6">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="#programs" className="hover:text-islamic-gold-400 transition-colors">Programs</Link></li>
                <li><Link href="#about" className="hover:text-islamic-gold-400 transition-colors">About Us</Link></li>
                <li><Link href="#tuition" className="hover:text-islamic-gold-400 transition-colors">Tuition & Pricing</Link></li>
                <li><Link href="/sign-in" className="hover:text-islamic-gold-400 transition-colors">Student Portal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-lg mb-6">Programs</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="hover:text-islamic-gold-400 transition-colors">Quran Reading</Link></li>
                <li><Link href="#" className="hover:text-islamic-gold-400 transition-colors">Hifz Program</Link></li>
                <li><Link href="#" className="hover:text-islamic-gold-400 transition-colors">Islamic Studies</Link></li>
                <li><Link href="#" className="hover:text-islamic-gold-400 transition-colors">Arabic Language</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-lg mb-6">Contact</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                   <div className="mt-1"><Phone className="w-4 h-4 text-islamic-gold-400" /></div>
                   <span>+1 (555) 123-4567<br/><span className="text-xs text-slate-500">Mon-Fri 9am-5pm EST</span></span>
                </li>
                <li className="flex items-start gap-3">
                   <div className="mt-1"><MessageCircle className="w-4 h-4 text-islamic-gold-400" /></div>
                   <span>support@islamicacademy.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2024 Islamic Academy. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}