import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { ProtocolError } from '../../../packages/protocol';

export type Session = {
  token: string;
  role: 'gm' | 'player';
  characterId?: string;
  expires: number;
  driver: boolean;
};
export const secretHash = (secret: string) => createHash('sha256').update(secret).digest('hex');
export const newCode = () => randomBytes(24).toString('base64url');
export function matches(secret: string, hash: string): boolean {
  const actual = Buffer.from(secretHash(secret), 'hex'),
    expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export class SessionManager {
  private sessions = new Map<string, Session>();
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(
    private credentials: () => { gmHash: string; invites: Record<string, string> },
    private now = Date.now,
  ) {}
  authenticate(
    peer: string,
    payload: { role: 'gm' | 'player'; token?: string; code?: string; driver?: boolean },
  ): Session {
    this.prune();
    if (payload.token) {
      const previous = this.sessions.get(secretHash(payload.token));
      if (previous && previous.expires > this.now() && previous.role === payload.role)
        return { ...previous, driver: Boolean(payload.driver) };
    }
    const rate = this.attempts.get(peer) || { count: 0, until: this.now() + 60000 };
    if (++rate.count > 5)
      throw new ProtocolError('RATE_LIMIT', 'Слишком много попыток. Подождите минуту.');
    this.attempts.set(peer, rate);
    const { gmHash, invites } = this.credentials();
    const characterId =
      payload.role === 'player'
        ? Object.entries(invites).find(([, hash]) => matches(payload.code || '', hash))?.[0]
        : undefined;
    if (payload.role === 'gm' ? !matches(payload.code || '', gmHash) : !characterId)
      throw new ProtocolError('AUTH_FAILED', 'Неверный код доступа');
    if (this.sessions.size >= 256) throw new ProtocolError('SERVER_BUSY', 'Достигнут лимит сессий');
    const session: Session = {
      role: payload.role,
      characterId,
      token: newCode(),
      expires: this.now() + 8 * 60 * 60 * 1000,
      driver: Boolean(payload.driver),
    };
    this.sessions.set(secretHash(session.token), session);
    return session;
  }
  isValid(session: Session | undefined): session is Session {
    return Boolean(
      session && session.expires > this.now() && this.sessions.has(secretHash(session.token)),
    );
  }
  revoke(token: string) {
    this.sessions.delete(secretHash(token));
  }
  revokeAll() {
    this.sessions.clear();
  }
  private prune() {
    for (const [key, s] of this.sessions) if (s.expires <= this.now()) this.sessions.delete(key);
    for (const [key, r] of this.attempts) if (r.until <= this.now()) this.attempts.delete(key);
    if (this.attempts.size > 10000) throw new ProtocolError('SERVER_BUSY', 'Сервер занят');
  }
}
