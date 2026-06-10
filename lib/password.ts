import crypto from 'crypto';

// Simple password hashing using crypto (builtin)
// For production, consider using bcrypt or argon2

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':');
    const hashedPassword = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hashedPassword === key;
  } catch (err) {
    return false;
  }
}
