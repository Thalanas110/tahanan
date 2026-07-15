import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { schemaMigrate } from '@/db/schemas';

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;

const DB_NAME = 'tahanan_db';

export const isNative = Capacitor.isNativePlatform();

export async function initSQLite(): Promise<boolean> {
  if (!isNative) {
    console.warn('SQLite is not supported on web. Skipping init.');
    return false;
  }

  try {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);
    
    // Check if db exists
    const ret = await sqliteConnection.checkConnectionsConsistency();
    const isConn = (await sqliteConnection.isConnection(DB_NAME, false)).result;
    
    if (ret.result && isConn) {
      db = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

    await db.open();

    // Run migrations/schema setup
    for (const statement of schemaMigrate) {
      await db.execute(statement);
    }
    
    return true;
  } catch (err) {
    console.error('Failed to initialize SQLite', err);
    return false;
  }
}

export function getDB(): SQLiteDBConnection {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}
