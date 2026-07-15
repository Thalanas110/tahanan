import { getDB, isNative } from './sqlite';
import { supabase } from './supabase';

export interface SyncAction {
  id?: number;
  action_type: string;
  payload: any;
  status?: string;
  created_at?: string;
}

export async function enqueueAction(actionType: string, payload: any): Promise<void> {
  if (!isNative) {
    // For web, you could use IndexedDB or just rely on online state.
    // For now, we log it since the requirement is Android-focused offline sync.
    console.warn('enqueueAction: Not supported on web. Falling back to immediate execution or dropping action.');
    return;
  }
  
  try {
    const db = getDB();
    await db.run(
      'INSERT INTO offline_queue (action_type, payload, status) VALUES (?, ?, ?)',
      [actionType, JSON.stringify(payload), 'pending']
    );
    console.log(`Action ${actionType} queued for offline sync.`);
  } catch (err) {
    console.error('Failed to enqueue action', err);
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!isNative) return;
  
  try {
    const db = getDB();
    const result = await db.query('SELECT * FROM offline_queue WHERE status = ? ORDER BY created_at ASC', ['pending']);
    
    if (result.values && result.values.length > 0) {
      console.log(`Processing ${result.values.length} queued actions...`);
      for (const row of result.values) {
        const payload = JSON.parse(row.payload);
        let success = false;
        
        try {
          // Implement action routing based on action_type here.
          // Examples:
          if (row.action_type === 'CREATE_NOTE') {
            const { error } = await supabase.from('love_notes').insert([payload]);
            if (!error) success = true;
          } else if (row.action_type === 'COMPLETE_TASK') {
            const { error } = await supabase.from('tasks').update({ is_completed: true }).eq('id', payload.taskId);
            if (!error) success = true;
          } else {
            console.warn(`Unknown action type: ${row.action_type}`);
            success = true; // Mark as success to remove it, or handle otherwise
          }
          
          if (success) {
            await db.run('UPDATE offline_queue SET status = ? WHERE id = ?', ['completed', row.id]);
          }
        } catch (err) {
          console.error(`Failed to process action ${row.id}`, err);
          // Optional: set to 'failed' after max retries
        }
      }
    }
  } catch (err) {
    console.error('Error processing sync queue:', err);
  }
}
