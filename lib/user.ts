export type User = { name: string; color: string };

export const PRESENCE_COLORS: readonly string[] = [
  '#0ea5e9',
  '#f97316',
  '#22c55e',
  '#a855f7',
  '#ec4899',
  '#eab308',
];

export function pickColor(): string {
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
}

export function saveUser(user: User): void {
  sessionStorage.setItem('user', JSON.stringify(user));
}

export function loadUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
