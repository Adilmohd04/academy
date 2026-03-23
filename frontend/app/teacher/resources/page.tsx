'use client';

import React, { useState, useEffect } from 'react';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import { FileText, Music, Video, Link as LinkIcon, Plus, Trash2, Loader2, ExternalLink, Pencil, Folder, ChevronRight, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';


interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'audio' | 'video' | 'link' | 'folder';
  url: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  parent_id?: string;
  profiles?: {
    full_name: string;
  };
}

const CATEGORIES = [
  'Quran',
  'Tajweed',
  'Fiqh',
  'Hadith',
  'Arabic',
  'General'
];

export default function TeacherResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string, title: string}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string, type: string}[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pdf' as 'pdf' | 'audio' | 'video' | 'link' | 'folder',
    url: '',
    category: 'General'
  });

  useEffect(() => {
    fetchResources();
  }, [currentFolderId]);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources?role=teacher');
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'pdf',
      url: '',
      category: 'General'
    });
    setUploadedFiles([]);
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (resource: Resource) => {
    setFormData({
      title: resource.title,
      description: resource.description || '',
      type: resource.type,
      url: resource.url,
      category: resource.category || 'General'
    });
    setEditingId(resource.id);
    setIsCreating(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    setUploading(true);
    
    try {
      // For folder type, upload files and track them
      if (formData.type === 'folder') {
        const uploaded: {name: string, url: string, type: string}[] = [];
        
        for (const file of files) {
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          // Determine file type
          let fileType = 'pdf';
          if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) fileType = 'audio';
          else if (['mp4', 'webm', 'mov'].includes(fileExt || '')) fileType = 'video';
          
          const filePath = `${fileType}s/${fileName}`;
          
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('filePath', filePath);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            uploaded.push({
              name: file.name.replace(/\.[^/.]+$/, ''),
              url: uploadData.publicUrl,
              type: fileType
            });
          }
        }
        
        setUploadedFiles(prev => [...prev, ...uploaded]);
        alert(`${uploaded.length} files ready to upload. Click "Submit for Approval" to create the folder with these files.`);
      }
      // If multiple files for non-folder types
      else if (files.length > 1) {
        let successCount = 0;
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${formData.type}s/${fileName}`;
          
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('filePath', filePath);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          if (!uploadRes.ok) continue;

          const uploadData = await uploadRes.json();
          
          // Create resource entry for each file
          const resourceData = {
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            description: formData.description || '',
            type: formData.type,
            url: uploadData.publicUrl,
            category: formData.category,
            parent_id: currentFolderId,
          };

          const createRes = await fetch('/api/resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resourceData),
          });

          if (createRes.ok) successCount++;
        }
        
        alert(`Successfully uploaded ${successCount} of ${files.length} files`);
        resetForm();
        fetchResources();
      } else {
        // Single file upload - just set the URL in the form
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${formData.type}s/${fileName}`;
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('filePath', filePath);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await res.json();
        setFormData(prev => ({ ...prev, url: data.publicUrl }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    
    if (formData.type !== 'folder' && !formData.url) {
      alert('Please provide a URL or upload a file');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        // For folders, use a placeholder URL
        url: formData.type === 'folder' ? '#folder' : formData.url,
        parent_id: currentFolderId
      };

      if (editingId) {
        // Update existing resource
        const res = await fetch(`/api/resources/${editingId}/details`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          resetForm();
          fetchResources();
        } else {
          const error = await res.json();
          alert('Error updating resource: ' + (error.error || 'Unknown error'));
        }
      } else {
        // Create new resource
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          resetForm();
          fetchResources();
        } else {
          const error = await res.json();
          alert('Error creating resource: ' + (error.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Error saving resource');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setResources(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const handleFolderClick = (folder: Resource) => {
    setFolderPath(prev => [...prev, { id: folder.id, title: folder.title }]);
    setCurrentFolderId(folder.id);
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
    // Filter by folder
    if (r.parent_id !== (currentFolderId || null)) return false;
    
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'audio': return <Music className="w-5 h-5 text-purple-500" />;
      case 'video': return <Video className="w-5 h-5 text-blue-500" />;
      case 'folder': return <Folder className="w-5 h-5 text-amber-500 fill-amber-100" />;
      default: return <LinkIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <TeacherPageContainer className="space-y-6">
      <IslamicPageHeader
        title="My Resources"
        subtitle="Share learning materials with students"
        className="!static"
        breadcrumbs={[
          { label: 'Dashboard', href: '/teacher' },
          { label: 'Resources' }
        ]}
        actions={[
          {
            label: isCreating ? 'Cancel' : 'Add Resource',
            icon: isCreating ? undefined : Plus,
            onClick: () => {
              if (isCreating) resetForm();
              else setIsCreating(true);
            },
            variant: isCreating ? 'secondary' : 'primary'
          }
        ]}
      />

      {/* Folder Breadcrumbs */}
      {folderPath.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            className="hover:text-emerald-600"
          >
            My Resources
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

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <IslamicCard className="p-6 border-emerald-100 bg-emerald-50/30">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-emerald-800">
                    {editingId ? 'Edit Resource' : 'Add New Resource'}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="e.g., Tajweed Rules PDF"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="audio">Audio File</option>
                      <option value="video">Video</option>
                      <option value="link">External Link</option>
                      <option value="folder">Folder (to organize resources)</option>
                    </select>
                    {formData.type === 'folder' && (
                      <p className="mt-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        💡 Upload multiple files to add them inside this folder automatically
                      </p>
                    )}
                  </div>
                  
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {formData.type === 'folder' ? 'Upload Files (Optional)' :
                       formData.type === 'link' ? 'Resource URL' : 'Upload File or URL'}
                    </label>
                    
                    {formData.type === 'link' ? (
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="https://..."
                        required
                      />
                    ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              multiple
                              onChange={handleFileUpload}
                              accept={
                                formData.type === 'pdf' ? '.pdf' :
                                formData.type === 'audio' ? 'audio/*' :
                                formData.type === 'video' ? 'video/*' : '*'
                              }
                              className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-50 file:text-emerald-700
                                hover:file:bg-emerald-100"
                              disabled={uploading}
                            />
                            {uploading && <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />}
                          </div>
                          <p className="text-xs text-emerald-600">💡 You can select multiple files to upload at once</p>
                          {uploadedFiles.length > 0 && (
                            <div className="mt-2 p-2 bg-emerald-50 rounded text-xs">
                              <p className="font-semibold text-emerald-800 mb-1">{uploadedFiles.length} files ready:</p>
                              {uploadedFiles.map((f, i) => (
                                <div key={i} className="text-emerald-700">✓ {f.name}</div>
                              ))}
                            </div>
                          )}
                          {formData.type !== 'folder' && (
                            <>
                              <div className="text-xs text-slate-500 text-center">- OR -</div>
                              <input
                                type="url"
                                value={formData.url}
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="https://..."
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px]"
                    placeholder="Brief description of the resource..."
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <IslamicButton
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    disabled={submitting || uploading}
                  >
                    Cancel
                  </IslamicButton>
                  <IslamicButton
                    type="submit"
                    variant="primary"
                    disabled={submitting || uploading}
                    loading={submitting}
                  >
                    {editingId ? 'Update Resource' : 'Submit for Approval'}
                  </IslamicButton>
                </div>
              </form>
            </IslamicCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filter === f
                ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No resources found</h3>
          <p className="text-slate-400">Upload resources to share with students.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredResources.map((resource) => (
            <IslamicCard key={resource.id} className="p-4 group hover:border-emerald-200 transition-colors">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg h-fit">
                    {getIcon(resource.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {resource.type === 'folder' ? (
                        <button 
                          onClick={() => handleFolderClick(resource)}
                          className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline text-left"
                        >
                          {resource.title}
                        </button>
                      ) : (
                        <h3 className="font-semibold text-slate-800">{resource.title}</h3>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {resource.category || 'General'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        resource.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        resource.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {resource.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{format(new Date(resource.created_at), 'PPP')}</span>
                      {resource.type !== 'folder' && (
                        <a 
                          href={resource.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Open Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleEdit(resource)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(resource.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </IslamicCard>
          ))}
        </div>
      )}
    </TeacherPageContainer>
  );
}