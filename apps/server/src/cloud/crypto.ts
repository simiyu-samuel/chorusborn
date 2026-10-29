import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

/** Every cloud payload is authenticated and encrypted, including tokens and coach snapshots. */
export class Vault {
  private readonly key: Buffer;
  constructor(
    key: string,
    private readonly namespace: string,
  ) {
    if (!/^[a-f0-9]{64}$/.test(key))
      throw new Error('CHORUSBORN_STATE_KEY must be 32 random bytes in hex.');
    this.key = Buffer.from(key, 'hex');
  }
  seal(value: unknown, purpose: string): string {
    const bytes = Buffer.from(JSON.stringify(value));
    if (bytes.length > 64_000_000) throw new Error('Cloud payload capacity exceeded.');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, nonce);
    cipher.setAAD(Buffer.from(`${this.namespace}:${purpose}:1`));
    const data = Buffer.concat([cipher.update(gzipSync(bytes)), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), data]).toString('base64');
  }
  open<T>(sealed: string, purpose: string): T {
    if (sealed.length > 16_000_000) throw new Error('Cloud envelope capacity exceeded.');
    const data = Buffer.from(sealed, 'base64');
    const cipher = createDecipheriv('aes-256-gcm', this.key, data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    cipher.setAAD(Buffer.from(`${this.namespace}:${purpose}:1`));
    return JSON.parse(
      gunzipSync(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]), {
        maxOutputLength: 64_000_000,
      }).toString('utf8'),
    ) as T;
  }
}
