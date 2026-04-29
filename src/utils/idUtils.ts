import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically random UUID v4.
 * Uses expo-crypto which works in both Expo Go and native builds.
 */
export function generateId(): string {
  return Crypto.randomUUID();
}
