import {describe, expect, it} from 'vitest';
import {createDb} from '../prisma/client';

describe('database configuration', () => {
  it.each(['', 'not a URL', 'file:./database.db', 'prisma://example.invalid', 'postgresql://', 'postgresql://localhost'])('rejects invalid runtime URL %j before connecting', async url => {
    // Construction is intentionally credentialless for Next production builds.
    const db = createDb(url);
    try { await expect(db.$connect()).rejects.toThrow(/DATABASE_URL/); }
    finally { await db.$disconnect(); }
  });
});
