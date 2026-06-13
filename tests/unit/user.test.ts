import { describe, it, expect, beforeEach } from 'vitest';
import { PRESENCE_COLORS, pickColor, saveUser, loadUser } from '@/lib/user';

describe('T1-1: pickColor', () => {
  it('returns a value always in PRESENCE_COLORS', () => {
    for (let i = 0; i < 20; i++) {
      const color = pickColor();
      expect(PRESENCE_COLORS).toContain(color);
    }
  });
});

describe('T1-2: saveUser / loadUser round-trip', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('loaded user matches saved user', () => {
    const user = { name: '재훈', color: '#0ea5e9' };
    saveUser(user);
    expect(loadUser()).toEqual(user);
  });
});

describe('T1-3: loadUser edge cases', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadUser()).toBeNull();
  });

  it('returns null when stored JSON is broken', () => {
    sessionStorage.setItem('user', '{broken json');
    expect(loadUser()).toBeNull();
  });
});
