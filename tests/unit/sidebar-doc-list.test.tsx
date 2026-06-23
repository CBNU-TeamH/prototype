import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const mockUseDocument = vi.hoisted(() => vi.fn());
const mockUsePresences = vi.hoisted(() => vi.fn());
const mockUseRouter = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());

vi.mock('@yorkie-js/react', () => ({
  useDocument: mockUseDocument,
  usePresences: mockUsePresences,
}));

vi.mock('next/navigation', () => ({
  useRouter: mockUseRouter,
}));

import SidebarDocList from '@/components/SidebarDocList';

const USER = { name: '재훈', color: '#0ea5e9' };

function makeDocContext(docs: { docKey: string; title: string; createdAt: number }[], loading = false) {
  const root = { docs };
  const doc = { getRoot: () => root };
  return { doc, loading, update: vi.fn() };
}

beforeEach(() => {
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockPush.mockReset();
  // Default: no presences
  mockUsePresences.mockReturnValue([]);
});

describe('SidebarDocList — document list', () => {
  it('renders a sidebar item for each document', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([
        { docKey: 'demo', title: 'demo', createdAt: 1000 },
        { docKey: 'doc-abc', title: 'My Note', createdAt: 2000 },
      ]),
    );
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('My Note')).toBeInTheDocument();
  });

  it('marks the current document as is-active', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([
        { docKey: 'demo', title: 'demo', createdAt: 1000 },
        { docKey: 'doc-abc', title: 'My Note', createdAt: 2000 },
      ]),
    );
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    // The "demo" item should have the is-active class.
    const demoItem = screen.getByText('demo').closest('.sidebar-item');
    expect(demoItem).toHaveClass('is-active');
    // The "My Note" item should NOT have it.
    const noteItem = screen.getByText('My Note').closest('.sidebar-item');
    expect(noteItem).not.toHaveClass('is-active');
  });

  it('navigates to the document when an item is clicked', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    fireEvent.click(screen.getByText('demo').closest('.sidebar-item')!);
    expect(mockPush).toHaveBeenCalledWith('/doc/demo');
  });

  it('shows participant avatars for a document from index presences', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    mockUsePresences.mockReturnValue([
      { clientID: 'a', presence: { name: '동현', color: '#f97316', activeDocKey: 'demo' } },
    ]);
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    expect(screen.getByTitle('동현')).toBeInTheDocument();
  });

  it('does not show avatars for users without activeDocKey', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    mockUsePresences.mockReturnValue([
      { clientID: 'b', presence: { name: '방문자', color: '#a855f7' } },
    ]);
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    expect(screen.queryByTitle('방문자')).toBeNull();
  });

  it('renders nothing while loading', () => {
    mockUseDocument.mockReturnValue(makeDocContext([], true));
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    expect(screen.queryByRole('button', { name: /demo/ })).toBeNull();
  });
});

describe('SidebarDocList — doc creation', () => {
  it('shows inline input when "+ 새 문서" is clicked', () => {
    mockUseDocument.mockReturnValue(makeDocContext([]));
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    fireEvent.click(screen.getByText('+ 새 문서'));
    expect(screen.getByPlaceholderText('제목 입력…')).toBeInTheDocument();
  });

  it('calls update and navigates on Enter with a non-empty title', () => {
    const updateFn = vi.fn();
    const root = { docs: [] as { docKey: string; title: string; createdAt: number }[] };
    const doc = { getRoot: () => root };
    mockUseDocument.mockReturnValue({ doc, loading: false, update: updateFn });

    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    fireEvent.click(screen.getByText('+ 새 문서'));
    const input = screen.getByPlaceholderText('제목 입력…');
    fireEvent.change(input, { target: { value: '새 문서' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updateFn).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalled();
    const destination = mockPush.mock.calls[0][0] as string;
    expect(destination).toMatch(/^\/doc\/doc-/);
  });

  it('does not navigate when Escape is pressed', () => {
    mockUseDocument.mockReturnValue(makeDocContext([]));
    render(<SidebarDocList currentDocKey="demo" user={USER} />);
    fireEvent.click(screen.getByText('+ 새 문서'));
    const input = screen.getByPlaceholderText('제목 입력…');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('제목 입력…')).toBeNull();
  });
});
