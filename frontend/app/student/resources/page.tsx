'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Download, ExternalLink, FileText, Music, Video, Link as LinkIcon, Search, Folder, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { IslamicLoader } from '@/components/ui/IslamicLoader';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicCard } from '@/components/ui/IslamicCards';
import React from 'react';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'audio' | 'video' | 'link' | 'folder';
  url: string;
  category: string;
  created_at: string;
  parent_id?: string;
  profiles?: {
    full_name: string;
  };
}

export default function StudentResourcesPage() {
  const { user } = useUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'pdf' | 'audio' | 'video'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string, title: string}[]>([]);

  // Security check
  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role as string;
      if (role !== 'student') {
        toast.error('Access Denied: Students only!');
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, router]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources?role=student');
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
      case 'audio': return <Music className="w-6 h-6 text-purple-500" />;
      case 'video': return <Video className="w-6 h-6 text-blue-500" />;
      case 'folder': return <Folder className="w-6 h-6 text-amber-500 fill-amber-100" />;
      default: return <LinkIcon className="w-6 h-6 text-slate-500" />;
    }
  };

  const handleFolderClick = (folder: Resource) => {
    setFolderPath(prev => [...prev, { id: folder.id, title: folder.title }]);
    setCurrentFolderId(folder.id);
    setSearchQuery(''); // Clear search when entering folder
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolderId(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  const filteredResources = resources.filter(r => {
    // If searching, search EVERYTHING (ignore folders structure)
    if (searchQuery) {
      return r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
             r.description.toLowerCase().includes(searchQuery.toLowerCase());
    }

    // Otherwise, respect folder structure
    if (r.parent_id !== (currentFolderId || null)) return false;

    const matchesType = selectedType === 'all' || r.type === selectedType;
    return matchesType;
  });

  if (loading) return <IslamicLoader />;

  return (
    <div className="min-h-screen bg-slate-50/50">
      
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <IslamicPageHeader
          title="Learning Resources"
          subtitle="Access study materials, audio files, and documents"
          breadcrumbs={[
            { label: 'Dashboard', href: '/student/dashboard' },
            { label: 'Resources' }
          ]}
        />

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {(['all', 'pdf', 'audio', 'video'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {type === 'all' ? 'All Resources' : type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Folder Breadcrumbs */}
        {!searchQuery && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleBreadcrumbClick(-1)}
              className={`hover:text-emerald-600 ${folderPath.length === 0 ? 'font-semibold text-emerald-700' : ''}`}
            >
              Root
            </button>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <button 
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`hover:text-emerald-600 ${index === folderPath.length - 1 ? 'font-semibold text-emerald-700' : ''}`}
                >
                  {folder.title}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No resources found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <IslamicCard className="h-full flex flex-col hover:shadow-lg transition-shadow duration-300 border-emerald-100/50">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        {getIcon(resource.type)}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                          {resource.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          {resource.category || 'General'}
                        </span>
                      </div>
                    </div>
                    
                    {resource.type === 'folder' ? (
                      <button 
                        onClick={() => handleFolderClick(resource)}
                        className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1 hover:text-emerald-600 hover:underline text-left w-full"
                      >
                        {resource.title}
                      </button>
                    ) : (
                      <h3 className="text-lg font-semibold text-slate-800 mb-2 line-clamp-1">
                        {resource.title}
                      </h3>
                    )}
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4">
                      {resource.description}
                    </p>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      Added by {resource.profiles?.full_name || 'Admin'}
                    </span>
                    {resource.type !== 'folder' && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {resource.type === 'link' ? 'Open Link' : 'Download'}
                        {resource.type === 'link' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      </a>
                    )}
                    {resource.type === 'folder' && (
                      <button
                        onClick={() => handleFolderClick(resource)}
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Open Folder
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </IslamicCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}