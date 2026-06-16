import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
const mockLoadUser = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/lib/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user')>();
  return { ...actual, loadUser: mockLoadUser };
});

import DashboardView from '@/components/DashboardView';

describe('T3.5-3: dashboard guard (no nickname → redirect home)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLoadUser.mockReset();
  });

  it('redirects to / and renders no doc card when no user is stored', () => {
    mockLoadUser.mockReturnValue(null);
    render(<DashboardView />);
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('button', { name: /demo/i })).not.toBeInTheDocument();
  });
});

describe('T3.5-4: dashboard renders the single doc card + nickname', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLoadUser.mockReset();
  });

  it('shows the demo doc card and the current nickname', () => {
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    render(<DashboardView />);
    expect(screen.getByRole('button', { name: /demo/i })).toBeInTheDocument();
    expect(screen.getByText('재훈')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('T3.5-5: clicking the doc card navigates to the editor', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLoadUser.mockReset();
  });

  it('pushes /doc/demo on card click', async () => {
    const user = userEvent.setup();
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    render(<DashboardView />);
    await user.click(screen.getByRole('button', { name: /demo/i }));
    expect(mockPush).toHaveBeenCalledWith('/doc/demo');
  });
});
