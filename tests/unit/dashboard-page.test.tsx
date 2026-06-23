import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.hoisted(() => vi.fn());
const mockReplace = vi.hoisted(() => vi.fn());
const mockLoadUser = vi.hoisted(() => vi.fn());
const mockUseDocument = vi.hoisted(() => vi.fn());
const mockUsePresences = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/lib/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user')>();
  return { ...actual, loadUser: mockLoadUser };
});

// Yorkie providers/hooks are stubbed — real-server behaviour is covered by
// manual tests. DashboardDocList uses useDocument for the index doc and
// usePresences for participant grouping. DashboardView wraps it in
// YorkieProvider + DocumentProvider (both pass children through as stubs).
vi.mock('@yorkie-js/react', () => ({
  YorkieProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DocumentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDocument: mockUseDocument,
  usePresences: mockUsePresences,
}));

import DashboardView from '@/components/DashboardView';

function makeDocContext(docs: { docKey: string; title: string; createdAt: number }[]) {
  const root = { docs };
  return { doc: { getRoot: () => root }, loading: false, update: vi.fn() };
}

describe('T3.5-3: dashboard guard (no nickname → redirect home)', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockLoadUser.mockReset();
    mockUseDocument.mockReturnValue(makeDocContext([]));
    mockUsePresences.mockReturnValue([]);
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
    mockUsePresences.mockReturnValue([]);
  });

  it('shows the demo doc card and the current nickname', () => {
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
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
    mockUsePresences.mockReturnValue([]);
  });

  it('pushes /doc/demo on card click', async () => {
    const user = userEvent.setup();
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    render(<DashboardView />);
    await user.click(screen.getByRole('button', { name: /demo/i }));
    expect(mockPush).toHaveBeenCalledWith('/doc/demo');
  });
});
