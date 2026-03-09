'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Video, FileText, Download, Search, PlayCircle } from 'lucide-react';
import { IslamicLoader } from '@/components/ui/IslamicLoader';

// Mock Data for Library
const categories = [
  { id: 'all', label: 'All Resources' },
  { id: 'quran', label: 'Quran & Tajweed' },
  { id: 'stories', label: 'Islamic Stories' },
  { id: 'worksheets', label: 'Worksheets' },
];

const resources = [
  {
    id: 1,
    title: 'Prophet Yunus (AS) and the Whale',
    type: 'story',
    category: 'stories',
    description: 'The story of patience and repentance.',
    thumbnail: '🐋',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    id: 2,
    title: 'Tajweed Basics: Noon Sakinah',
    type: 'pdf',
    category: 'quran',
    description: 'Learn the rules of Noon Sakinah and Tanween.',
    thumbnail: '📖',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 3,
    title: 'Daily Duas for Kids',
    type: 'pdf',
    category: 'worksheets',
    description: 'Printable cards for daily supplications.',
    thumbnail: '🤲',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    id: 4,
    title: 'Understanding Surah Al-Fatiha',
    type: 'video',
    category: 'quran',
    description: 'A deep dive into the opening chapter of the Quran.',
    thumbnail: '🎥',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    id: 5,
    title: 'The Boy and the King',
    type: 'story',
    category: 'stories',
    description: 'A story about faith and courage.',
    thumbnail: '👑',
    color: 'bg-rose-100 text-rose-700',
  },
];

export default function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResources = resources.filter(resource => {
    const matchesCategory = activeCategory === 'all' || resource.category === activeCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 pb-20">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif text-[#1B365D] mb-3 font-bold">Library</h1>
        <p className="text-[#64748B] text-lg">Explore a treasure trove of Islamic knowledge.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-[#1a4731] text-white shadow-md' 
                  : 'bg-white text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.length > 0 ? (
          filteredResources.map((resource) => (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:shadow-lg hover:border-[#C5A059]/30 transition-all group cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${resource.color}`}>
                {resource.thumbnail}
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] bg-[#F8FAFC] px-2 py-1 rounded-md">
                    {resource.type}
                  </span>
                </div>
                <h3 className="text-xl font-serif text-[#1B365D] font-bold group-hover:text-[#C5A059] transition-colors">
                  {resource.title}
                </h3>
                <p className="text-[#64748B] text-sm mt-2 line-clamp-2">
                  {resource.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
                <span className="text-xs font-bold text-[#64748B]">Added recently</span>
                <button className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center text-[#1B365D] group-hover:bg-[#1a4731] group-hover:text-white transition-colors">
                  {resource.type === 'video' ? <PlayCircle size={16} /> : <Download size={16} />}
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-20">
            <div className="w-20 h-20 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#1B365D]">No resources found</h3>
            <p className="text-[#64748B]">Try adjusting your search or category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
