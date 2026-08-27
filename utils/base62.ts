import crypto from 'crypto';

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = BASE62_ALPHABET.length; // 62

/**
 * Encodes a numeric integer ID to a Base62 string.
 */
export function encodeBase62(num: number | bigint): string {
  if (num === 0 || num === 0n) return BASE62_ALPHABET[0];
  let n = typeof num === 'number' ? BigInt(num) : num;
  let result = '';
  const bigBase = BigInt(BASE);

  while (n > 0n) {
    const remainder = Number(n % bigBase);
    result = BASE62_ALPHABET[remainder] + result;
    n = n / bigBase;
  }
  return result;
}

/**
 * Decodes a Base62 string back to a numeric BigInt ID.
 */
export function decodeBase62(str: string): bigint {
  let result = 0n;
  const bigBase = BigInt(BASE);

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const index = BASE62_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: '${char}'`);
    }
    result = result * bigBase + BigInt(index);
  }
  return result;
}

/**
 * Generates a cryptographically random 6-7 character Base62 string.
 * @param length Defaults to 6 characters (provides ~56.8 billion permutations)
 */
export function generateRandomCode(length: number = 6): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += BASE62_ALPHABET[bytes[i] % BASE];
  }
  return code;
}

/**
 * Validates whether a given string is a valid custom short code (alphanumeric, 3-20 chars).
 */
export function isValidCustomCode(code: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(code);
}
