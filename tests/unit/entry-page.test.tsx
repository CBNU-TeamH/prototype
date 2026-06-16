import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockSaveUser = vi.hoisted(() => vi.fn());

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock lib/user (keep real pickColor/PRESENCE_COLORS, stub saveUser)
vi.mock('@/lib/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user')>();
  return {
    ...actual,
    saveUser: mockSaveUser,
  };
});

import EntryPage from '@/app/page';

describe('T1-4: empty input → button disabled, filled → enabled', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSaveUser.mockClear();
  });

  it('button is disabled when input is empty', () => {
    render(<EntryPage />);
    const button = screen.getByRole('button', { name: /참가/i });
    expect(button).toBeDisabled();
  });

  it('button is enabled when input has non-whitespace text', async () => {
    const user = userEvent.setup();
    render(<EntryPage />);
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /참가/i });
    await user.type(input, '재훈');
    expect(button).toBeEnabled();
  });

  it('button is disabled when input contains only whitespace', async () => {
    const user = userEvent.setup();
    render(<EntryPage />);
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button', { name: /참가/i });
    await user.type(input, '   ');
    expect(button).toBeDisabled();
  });
});

describe('T1-5: join button click → saveUser + router.push', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSaveUser.mockClear();
  });

  it('calls saveUser and router.push(/doc/demo) on click', async () => {
    const user = userEvent.setup();
    render(<EntryPage />);
    const input = screen.getByRole('textbox');
    await user.type(input, '재훈');
    const button = screen.getByRole('button', { name: /참가/i });
    await user.click(button);
    expect(mockSaveUser).toHaveBeenCalledOnce();
    const savedArg = mockSaveUser.mock.calls[0][0];
    expect(savedArg.name).toBe('재훈');
    expect(typeof savedArg.color).toBe('string');
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});

describe('T1-6: Enter key triggers join', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSaveUser.mockClear();
  });

  it('pressing Enter with a name calls saveUser and router.push', async () => {
    const user = userEvent.setup();
    render(<EntryPage />);
    const input = screen.getByRole('textbox');
    await user.type(input, '재훈{Enter}');
    expect(mockSaveUser).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
