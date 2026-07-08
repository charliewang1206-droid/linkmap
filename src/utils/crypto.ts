// ============================================================
// Web Crypto API encryption utilities for API keys
// ============================================================

const ALGORITHM = 'AES-GCM';
const KEY_ALGORITHM = { name: ALGORITHM, length: 256 };
const KEY_STORAGE_KEY = 'linkmap-crypto-key';

// Get or create encryption key (stored as JWK in appState)
async function getOrCreateKey(): Promise<CryptoKey> {
  // Try to load existing key from localStorage (simpler than IndexedDB for crypto)
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      const jwk = JSON.parse(stored);
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        KEY_ALGORITHM,
        false, // extractable
        ['encrypt', 'decrypt']
      );
    } catch {
      // Key corrupted, generate new one
      localStorage.removeItem(KEY_STORAGE_KEY);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ['encrypt', 'decrypt']);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(jwk));
  return key;
}

/**
 * Encrypt an API key using AES-GCM
 * Returns encrypted data and IV as Base64 strings
 */
export async function encryptAPIKey(plainText: string): Promise<{ encrypted: string; iv: string }> {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt an encrypted API key
 */
export async function decryptAPIKey(encrypted: string, iv: string): Promise<string> {
  const key = await getOrCreateKey();
  const ciphertext = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivArray },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Check if encryption is available in current browser
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}
