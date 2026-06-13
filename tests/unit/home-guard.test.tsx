import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReplace = vi.hoisted(() => vi.fn());
const mockLoadUser = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock('@/lib/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user')>();
  return { ...actual, loadUser: mockLoadUser, saveUser: vi.fn() };
});

import EntryPage from '@/app/page';

describe('T2-7: home guard (existing nickname → auto-redirect to /doc/demo)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockLoadUser.mockReset();
  });

  it('does not redirect when no user is stored', () => {
    mockLoadUser.mockReturnValue(null);
    render(<EntryPage />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /doc/demo when a user is already stored', () => {
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    render(<EntryPage />);
    expect(mockReplace).toHaveBeenCalledWith('/doc/demo');
  });
});
