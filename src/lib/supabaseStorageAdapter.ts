import { isNative, getDB } from './sqlite';

export const supabaseStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (!isNative) {
      return localStorage.getItem(key);
    }
    
    try {
      const db = getDB();
      const result = await db.query('SELECT value FROM auth_session WHERE key = ?', [key]);
      if (result.values && result.values.length > 0) {
        return result.values[0].value;
      }
      return null;
    } catch (err) {
      console.error('SQLite getItem error:', err);
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      localStorage.setItem(key, value);
      return;
    }
    
    try {
      const db = getDB();
      await db.run(
        'INSERT INTO auth_session (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value]
      );
    } catch (err) {
      console.error('SQLite setItem error:', err);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    if (!isNative) {
      localStorage.removeItem(key);
      return;
    }
    
    try {
      const db = getDB();
      await db.run('DELETE FROM auth_session WHERE key = ?', [key]);
    } catch (err) {
      console.error('SQLite removeItem error:', err);
    }
  }
};
