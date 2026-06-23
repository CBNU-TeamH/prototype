import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReplace = vi.hoisted(() => vi.fn());
const mockLoadUser = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

vi.mock('@/lib/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/user')>();
  return { ...actual, loadUser: mockLoadUser };
});

// Yorkie providers/hooks are stubbed — real-server behaviour is covered by manual tests.
// useDocument is called by SidebarDocList (index doc), MarkdownEditor/PresenceBar (content doc).
// usePresences is called by useDocIndex (index presences) and PresenceBar (content presences).
// Both providers and both clients pass children through as stubs.
vi.mock('@yorkie-js/react', () => ({
  YorkieProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DocumentProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  usePresences: () => [],
  useConnection: () => 'connected',
  useDocument: () => ({
    loading: false,
    doc: {
      getRoot: () => ({
        docs: [{ docKey: 'demo', title: 'demo', createdAt: 1000 }],
      }),
    },
    update: () => {},
  }),
  // MarkdownEditor early-returns when there is no client, so a stub is enough.
  useYorkie: () => ({ client: undefined }),
  Text: class {},
  StreamConnectionStatus: { Connected: 'connected', Disconnected: 'disconnected' },
}));

import EditorView from '@/components/EditorView';

describe('T2-8: document page guard (no nickname → redirect to /)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockLoadUser.mockReset();
  });

  it('redirects to / when there is no stored user', () => {
    mockLoadUser.mockReturnValue(null);
    render(<EditorView docKey="demo" />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not redirect and renders the shell when a user exists', () => {
    mockLoadUser.mockReturnValue({ name: '재훈', color: '#0ea5e9' });
    render(<EditorView docKey="demo" />);
    expect(mockReplace).not.toHaveBeenCalled();
    // Shell rendered (presences come from the live server, mocked empty here).
    expect(screen.getByText('demo')).toBeInTheDocument();
  });
});
