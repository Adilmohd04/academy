import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

export const getResources = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    
    let query = supabase
      .from('resources')
      .select('*, profiles(full_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // If student, only show approved
    if (role === 'student') {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createResource = async (req: Request, res: Response) => {
  try {
    const { title, description, type, url } = req.body;
    const userId = (req as any).auth?.userId;
    const userRole = (req as any).auth?.sessionClaims?.metadata?.role || 'student';

    // Get profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const status = userRole === 'admin' ? 'approved' : 'pending';

    const { data, error } = await supabase
      .from('resources')
      .insert([
        {
          title,
          description,
          type,
          url,
          created_by: userId,
          status,
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

export const updateResourceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    const { data, error } = await supabase
      .from('resources')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('resources')
      .update({ is_active: false, updated_at: new Date().toISOString() }) // Soft delete
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
