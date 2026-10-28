import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Playbook, ChannelIdentity } from '@chorusborn/contracts';

export type StoredStudio = {
  id: string;
  token: string;
  overlayKey: string;
  playbook: Playbook;
  channel?: ChannelIdentity;
};

// A small, explicitly local fixture store. Production PostgreSQL is a separate milestone.
export class LocalStore {
  records: StoredStudio[] = [];
  private writes: Promise<void> = Promise.resolve();
  constructor(private readonly path: string | null) {}
  async load() {
    if (!this.path) return;
    try {
      const parsed: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (!Array.isArray(parsed) || parsed.length > 20)
        throw new Error('Invalid local studio store.');
      for (const item of parsed) {
        if (
          !item ||
          typeof item.id !== 'string' ||
          typeof item.token !== 'string' ||
          typeof item.overlayKey !== 'string' ||
          (item.channel !== undefined &&
            (!item.channel ||
              typeof item.channel.id !== 'string' ||
              typeof item.channel.login !== 'string' ||
              !/^\d{1,32}$/.test(item.channel.id) ||
              !/^[a-z0-9_]{1,25}$/.test(item.channel.login))) ||
          !item.playbook ||
          !Number.isInteger(item.playbook.version) ||
          !Array.isArray(item.playbook.rules)
        )
          throw new Error('Invalid local studio record.');
      }
      const ids = parsed.filter((item) => item.channel).map((item) => item.channel.id);
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate channel ownership.');
      this.records = parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  async put(record: StoredStudio) {
    const operation = this.writes.then(async () => {
      const next = [
        ...this.records.filter((item) => item.id !== record.id),
        structuredClone(record),
      ];
      if (this.path) {
        await mkdir(dirname(this.path), { recursive: true });
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, this.path);
      }
      this.records = next;
    });
    this.writes = operation.catch(() => {});
    await operation;
  }
}
