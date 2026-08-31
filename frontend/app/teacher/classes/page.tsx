'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Users, Video, Clock, Calendar, 
  CheckCircle, XCircle, AlertCircle, ExternalLink,
  MoreVertical, MapPin, Plus, Trash2, Link as LinkIcon,
  Save, FileText, X, Phone, Mail
} from 'lucide-react';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Resource {
  name: string;
  url: string;
}

interface Student {
  bookingId: string;
  name: string;
  email: string;
  phone?: string;
  attendance: string;
  meetingLink?: string;
}

interface ClassSession {
  id: string; // Use the first booking ID as the group ID
  date: string; // YYYY-MM-DD
  time: string;
  rawDate: string;
  topic: string;
  status: string;
  students: Student[];
  resources: Resource[];
  meetingLink?: string; // Main meeting link (usually same for all)
}

export default function TeacherClasses() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  
  // State for managing resources being edited
  const [editingResources, setEditingResources] = useState<{[key: string]: Resource[]}>({});
  const [newResourceName, setNewResourceName] = useState<{[key: string]: string}>({});
  const [newResourceUrl, setNewResourceUrl] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API}/api/meetings/teacher/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      
      const meetingsData = result.data || [];
      
      if (meetingsData.length > 0) {
        // Group meetings by date + time + topic
        const grouped: { [key: string]: ClassSession } = {};

        meetingsData.forEach((meeting: any) => {
          const timeSlot = Array.isArray(meeting.time_slots) ? meeting.time_slots[0] : meeting.time_slots;
          const startTime = timeSlot?.start_time || '';
          const endTime = timeSlot?.end_time || '';
          
          const formatTime = (time: string) => {
            if (!time) return '';
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours);
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${h12}:${minutes} ${period}`;
          };
          
          const timeDisplay = startTime && endTime 
            ? `${formatTime(startTime)} - ${formatTime(endTime)}`
            : timeSlot?.slot_name || 'Time not set';

          // Create a unique key for grouping
          const groupKey = `${meeting.meeting_date}-${startTime}-${meeting.topic || 'General'}`;

          // Parse resources
          let resources: Resource[] = [];
          if (meeting.resources) {
            if (Array.isArray(meeting.resources)) {
              resources = meeting.resources;
            } else if (typeof meeting.resources === 'string') {
              try {
                resources = JSON.parse(meeting.resources);
              } catch (e) {
                resources = [];
              }
            }
          }
          if (resources.length === 0 && meeting.resource_link) {
            resources.push({ name: 'Main Resource', url: meeting.resource_link });
          }

          const student: Student = {
            bookingId: meeting.id,
            name: meeting.student_name,
            email: meeting.student_email,
            phone: meeting.student_phone,
            attendance: meeting.attendance || 'pending',
            meetingLink: meeting.meeting_link
          };

          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              id: meeting.id, // Use first booking ID as reference
              date: meeting.meeting_date,
              rawDate: meeting.meeting_date,
              time: timeDisplay,
              topic: meeting.topic || meeting.course_name || 'Class Session',
              status: meeting.approval_status,
              students: [student],
              resources: resources,
              meetingLink: meeting.meeting_link
            };
          } else {
            grouped[groupKey].students.push(student);
          }
        });
        
        const transformedClasses = Object.values(grouped);
        
        // Sort by date
        transformedClasses.sort((a, b) => 
          new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
        );
        
        setClasses(transformedClasses);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = (classId: string) => {
    const name = newResourceName[classId];
    const url = newResourceUrl[classId];
    
    if (!name || !url) {
      toast.error('Please enter both name and URL');
      return;
    }

    const currentResources = editingResources[classId] || classes.find(c => c.id === classId)?.resources || [];
    const updatedResources = [...currentResources, { name, url }];
    
    setEditingResources({
      ...editingResources,
      [classId]: updatedResources
    });
    
    setNewResourceName({ ...newResourceName, [classId]: '' });
    setNewResourceUrl({ ...newResourceUrl, [classId]: '' });
  };

  const handleRemoveResource = (classId: string, index: number) => {
    const currentResources = editingResources[classId] || classes.find(c => c.id === classId)?.resources || [];
    const updatedResources = [...currentResources];
    updatedResources.splice(index, 1);
    
    setEditingResources({
      ...editingResources,
      [classId]: updatedResources
    });
  };

  const saveResources = async (classSession: ClassSession) => {
    const resourcesToSave = editingResources[classSession.id];
    if (!resourcesToSave) return;

    try {
      const token = await getToken();
      
      // Update ALL bookings in this group
      const updatePromises = classSession.students.map(student => 
        fetch(`${API}/api/meetings/${student.bookingId}/resources`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resources: resourcesToSave }),
        })
      );

      await Promise.all(updatePromises);

      toast.success('Resources updated for all students');
      
      // Update local state
      setClasses(classes.map(c => 
        c.id === classSession.id ? { ...c, resources: resourcesToSave } : c
      ));
      
      // Clear editing state
      const newEditing = { ...editingResources };
      delete newEditing[classSession.id];
      setEditingResources(newEditing);
      
    } catch (error) {
      console.error('Error saving resources:', error);
      toast.error('Failed to save resources');
    }
  };

  const markAttendance = async (bookingId: string, status: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API}/api/meetings/${bookingId}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attendance: status }),
      });

      if (!response.ok) throw new Error('Failed to update attendance');

      toast.success(`Attendance marked as ${status}`);
      
      // Update local state
      setClasses(prevClasses => prevClasses.map(c => ({
        ...c,
        students: c.students.map(s => 
          s.bookingId === bookingId ? { ...s, attendance: status } : s
        )
      })));

      // Also update selectedClass if open
      if (selectedClass) {
        setSelectedClass(prev => prev ? ({
          ...prev,
          students: prev.students.map(s => 
            s.bookingId === bookingId ? { ...s, attendance: status } : s
          )
        }) : null);
      }

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const filteredClasses = classes.filter(c => {
    const classDate = new Date(c.rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === 'upcoming') {
      return classDate >= today;
    } else {
      return classDate < today;
    }
  });

  return (
    <div className="min-h-screen bg-slate-100/40">
      <IslamicPatternBackground>
        <TeacherPageContainer className="relative z-10">
          <IslamicPageHeader 
            title="My Classes" 
            subtitle="Manage your schedule, resources, and student attendance"
            className="!static"
          />

          {/* Tabs */}
          <div className="flex space-x-4 mb-8 border-b border-amber-200">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-4 px-4 text-lg font-medium transition-colors relative ${
              activeTab === 'upcoming' 
                ? 'text-emerald-800' 
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            Upcoming Classes
            {activeTab === 'upcoming' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-4 px-4 text-lg font-medium transition-colors relative ${
              activeTab === 'past' 
                ? 'text-emerald-800' 
                : 'text-gray-500 hover:text-emerald-600'
            }`}
          >
            Past Classes
            {activeTab === 'past' && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full"
              />
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-amber-100">
            <GraduationCap className="h-16 w-16 text-amber-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900">No classes found</h3>
            <p className="text-gray-500 mt-2">You don't have any {activeTab} classes scheduled.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredClasses.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    {/* Class Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {session.topic}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {session.students.length} Student{session.students.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-emerald-600" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4 text-emerald-600" />
                          <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline truncate max-w-[200px]">
                            {session.meetingLink || 'No link generated'}
                          </a>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <button
                          onClick={() => setSelectedClass(session)}
                          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          View Students & Attendance
                        </button>
                      </div>
                    </div>

                    {/* Resources Section */}
                    <div className="flex-1 md:pl-6">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Class Resources</h4>
                          {editingResources[session.id] && (
                            <button 
                              onClick={() => saveResources(session)}
                              className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              <Save className="h-3 w-3" /> Save Changes
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 mb-3">
                          {(editingResources[session.id] || session.resources).map((resource, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-600 hover:underline truncate">
                                <LinkIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{resource.name}</span>
                              </a>
                              <button 
                                onClick={() => handleRemoveResource(session.id, idx)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add Resource Form */}
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            placeholder="Resource Name (e.g. Slides)"
                            value={newResourceName[session.id] || ''}
                            onChange={(e) => setNewResourceName({ ...newResourceName, [session.id]: e.target.value })}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="URL (https://...)"
                              value={newResourceUrl[session.id] || ''}
                              onChange={(e) => setNewResourceUrl({ ...newResourceUrl, [session.id]: e.target.value })}
                              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-900"
                            />
                            <button
                              onClick={() => handleAddResource(session.id)}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Students Modal */}
        <AnimatePresence>
          {selectedClass && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedClass(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50/50">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedClass.topic}</h2>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedClass.date).toLocaleDateString()} • {selectedClass.time}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClass(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {selectedClass.students.map((student) => (
                      <div key={student.bookingId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-full border border-gray-200">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{student.name}</h3>
                            <div className="flex flex-col text-xs text-gray-500 gap-1 mt-1">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {student.email}
                              </div>
                              {student.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {student.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => markAttendance(student.bookingId, 'present')}
                            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                              student.attendance === 'present'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => markAttendance(student.bookingId, 'absent')}
                            className={`flex-1 sm:flex-none py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                              student.attendance === 'absent'
                                ? 'bg-red-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </TeacherPageContainer>
      </IslamicPatternBackground>
    </div>
  );
}
