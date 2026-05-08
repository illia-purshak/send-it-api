import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';

export function hashSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateToken(): string {
  return randomBytes(40).toString('hex');
}

export function encryptTotp(secret: string): string {
  const key = Buffer.from(process.env['TOTP_ENCRYPTION_KEY']!, 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTotp(encryptedValue: string): string {
  const key = Buffer.from(process.env['TOTP_ENCRYPTION_KEY']!, 'hex');
  const [ivHex, encHex] = encryptedValue.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}
