import { supabase } from '../../../config/database';

interface DraftData {
  entity_type: string;
  entity_id: string;
  teacher_id: string;
  draft_content: any;
}

export class AutosaveService {
  /**
   * Save or update draft content
   */
  async saveDraft(data: DraftData) {
    const { entity_type, entity_id, teacher_id, draft_content } = data;

    // Check if draft already exists
    const { data: existing, error: fetchError } = await supabase
      .from('draft_autosaves')
      .select('*')
      .eq('entity_type', entity_type)
      .eq('teacher_id', teacher_id)
      .eq('entity_id', entity_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check existing draft: ${fetchError.message}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

    if (existing) {
      // Update existing draft
      const { data: updated, error: updateError } = await supabase
        .from('draft_autosaves')
        .update({
          draft_content,
          last_autosaved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update draft: ${updateError.message}`);
      }

      return updated;
    } else {
      // Create new draft
      const { data: created, error: insertError } = await supabase
        .from('draft_autosaves')
        .insert({
          entity_type,
          entity_id,
          teacher_id,
          draft_content,
          last_autosaved_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create draft: ${insertError.message}`);
      }

      return created;
    }
  }

  /**
   * Get latest draft for an entity
   */
  async getLatestDraft(teacherId: string, entityType: string, entityId?: string) {
    let query = supabase
      .from('draft_autosaves')
      .select('*')
      .eq('entity_type', entityType)
      .eq('teacher_id', teacherId);

    if (entityId) {
      query = query.eq('entity_id', entityId);
    } else {
      query = query.is('entity_id', null);
    }

    const { data, error } = await query
      .order('last_autosaved_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get draft: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a specific draft
   */
  async deleteDraft(draftId: string, teacherId: string) {
    const { error } = await supabase
      .from('draft_autosaves')
      .delete()
      .eq('id', draftId)
      .eq('teacher_id', teacherId);

    if (error) {
      throw new Error(`Failed to delete draft: ${error.message}`);
    }
  }

  /**
   * Clean up expired drafts (older than expires_at)
   */
  async cleanupExpiredDrafts(): Promise<number> {
    const { data, error } = await supabase
      .from('draft_autosaves')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup drafts: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get all drafts for a teacher
   */
  async getTeacherDrafts(teacherId: string) {
    const { data, error } = await supabase
      .from('draft_autosaves')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('last_autosaved_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get teacher drafts: ${error.message}`);
    }

    return data;
  }
}
