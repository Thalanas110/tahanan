export const createAuthSessionTable = `
  CREATE TABLE IF NOT EXISTS auth_session (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

export const createOfflineQueueTable = `
  CREATE TABLE IF NOT EXISTS offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  );
`;

export const schemaMigrate = [
  createAuthSessionTable,
  createOfflineQueueTable
];
