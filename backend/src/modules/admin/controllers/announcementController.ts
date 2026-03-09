import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, content, link, link_text, is_important, is_pinned } = req.body;
    const userId = (req as any).auth?.userId;

    // Get profile id from clerk id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([
        {
          title,
          content,
          link,
          link_text,
          is_important: is_important || false,
          is_pinned: is_pinned || false,
          created_by: profile.id,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, link, link_text, is_important, is_pinned, is_active } = req.body;

    const { data, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        link,
        link_text,
        is_important,
        is_pinned,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.query; // Or params, depending on route
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
