/**
 * Application configuration constants.
 */

export const CONFIG = {
  /** Turso database URL for HTTP API */
  TURSO_URL: import.meta.env.VITE_TURSO_URL as string ?? '',
  /** Turso auth token (read-only for client) */
  TURSO_TOKEN: import.meta.env.VITE_TURSO_TOKEN as string ?? '',

  /** localStorage key prefix */
  LS_PREFIX: 'ponto-dot8',
  /** Session storage key */
  LS_SESSION: 'ponto-dot8:session',

  /** IndexedDB name for offline sync */
  IDB_NAME: 'ponto-dot8-offline',
  IDB_VERSION: 1,
  IDB_STORE: 'sync-queue',

  /** Default geofence tolerance (meters) */
  DEFAULT_GEOFENCE_RADIUS: 70,

  /** GPS accuracy threshold (meters) */
  GPS_ACCURACY_THRESHOLD: 50,
} as const;
