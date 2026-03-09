import { supabase } from '../../../config/database';

export interface LiveSession {
  id: string;
  course_id: string;
  section_id?: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meet_link?: string;
  is_live: boolean;
  recording_url?: string;
  created_at: string;
}

export interface CreateLiveSessionInput {
  course_id: string;
  section_id?: string;
  title: string;
  scheduled_at: string;
  duration_minutes?: number;
  meet_link?: string;
}

export interface DoubtSession {
  id: string;
  course_id: string;
  title: string;
  scheduled_at: string;
  meet_link?: string;
  is_live: boolean;
  recording_url?: string;
  created_at: string;
}

export interface CreateDoubtSessionInput {
  course_id: string;
  title: string;
  scheduled_at: string;
  meet_link?: string;
}

/**
 * Schedule a live session
 */
export const createLiveSession = async (data: CreateLiveSessionInput): Promise<LiveSession> => {
  const { data: session, error } = await supabase
    .from('live_sessions')
    .insert([{ ...data, duration_minutes: data.duration_minutes || 60 }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create live session: ${error.message}`);
  return session;
};

/**
 * Get live sessions for a course
 */
export const getCourseLiveSessions = async (courseId: string): Promise<LiveSession[]> => {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('scheduled_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch live sessions: ${error.message}`);
  return data || [];
};

/**
 * Mark session as live (Teacher starts session)
 */
export const startLiveSession = async (sessionId: string): Promise<LiveSession> => {
  const { data, error } = await supabase
    .from('live_sessions')
    .update({ is_live: true })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to start session: ${error.message}`);
  return data;
};

/**
 * End session and add recording
 */
export const endLiveSession = async (sessionId: string, recordingUrl: string): Promise<LiveSession> => {
  const { data, error } = await supabase
    .from('live_sessions')
    .update({ is_live: false, recording_url: recordingUrl })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to end session: ${error.message}`);
  return data;
};

/**
 * Create doubt clearing session
 */
export const createDoubtSession = async (data: CreateDoubtSessionInput): Promise<DoubtSession> => {
  const { data: session, error } = await supabase
    .from('doubt_sessions')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create doubt session: ${error.message}`);
  return session;
};

/**
 * Get doubt sessions for a course
 */
export const getCourseDoubtSessions = async (courseId: string): Promise<DoubtSession[]> => {
  const { data, error } = await supabase
    .from('doubt_sessions')
    .select('*')
    .eq('course_id', courseId)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch doubt sessions: ${error.message}`);
  return data || [];
};

/**
 * Start doubt session
 */
export const startDoubtSession = async (sessionId: string): Promise<DoubtSession> => {
  const { data, error } = await supabase
    .from('doubt_sessions')
    .update({ is_live: true })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to start doubt session: ${error.message}`);
  return data;
};

/**
 * End doubt session
 */
export const endDoubtSession = async (sessionId: string, recordingUrl: string): Promise<DoubtSession> => {
  const { data, error } = await supabase
    .from('doubt_sessions')
    .update({ is_live: false, recording_url: recordingUrl })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to end doubt session: ${error.message}`);
  return data;
};
