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

import DashboardDocList from '@/components/DashboardDocList';

const USER = { name: '재훈', color: '#0ea5e9' };

function makeDocContext(docs: { docKey: string; title: string; createdAt: number }[], loading = false) {
  const root = { docs };
  const doc = {
    getRoot: () => root,
  };
  return {
    doc,
    loading,
    update: vi.fn(),
  };
}

beforeEach(() => {
  mockUseRouter.mockReturnValue({ push: mockPush });
  mockPush.mockReset();
  // Default: no presences (no participants on any doc)
  mockUsePresences.mockReturnValue([]);
});

describe('DashboardDocList — document cards', () => {
  it('renders a card for each document in the index', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([
        { docKey: 'demo', title: 'demo', createdAt: 1000 },
        { docKey: 'doc-abc', title: 'My Note', createdAt: 2000 },
      ]),
    );
    render(<DashboardDocList user={USER} />);
    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('My Note')).toBeInTheDocument();
  });

  it('shows the correct item count', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([
        { docKey: 'demo', title: 'demo', createdAt: 1000 },
        { docKey: 'doc-abc', title: 'My Note', createdAt: 2000 },
      ]),
    );
    render(<DashboardDocList user={USER} />);
    expect(screen.getByText('2 item')).toBeInTheDocument();
  });

  it('shows "…" while loading', () => {
    mockUseDocument.mockReturnValue(makeDocContext([], true));
    render(<DashboardDocList user={USER} />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('navigates to the document when a card is clicked', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    render(<DashboardDocList user={USER} />);
    fireEvent.click(screen.getByText('demo').closest('button')!);
    expect(mockPush).toHaveBeenCalledWith('/doc/demo');
  });

  it('shows participant avatars for a document from index presences', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    // Simulate one user viewing "demo"
    mockUsePresences.mockReturnValue([
      { clientID: 'a', presence: { name: '동현', color: '#f97316', activeDocKey: 'demo' } },
    ]);
    render(<DashboardDocList user={USER} />);
    expect(screen.getByTitle('동현')).toBeInTheDocument();
  });

  it('does not show participant avatars for a doc the user is not viewing', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([
        { docKey: 'demo', title: 'demo', createdAt: 1000 },
        { docKey: 'doc-abc', title: 'My Note', createdAt: 2000 },
      ]),
    );
    // User is viewing "demo", not "doc-abc"
    mockUsePresences.mockReturnValue([
      { clientID: 'a', presence: { name: '동현', color: '#f97316', activeDocKey: 'demo' } },
    ]);
    render(<DashboardDocList user={USER} />);
    // Avatar should appear on the "demo" card
    expect(screen.getByTitle('동현')).toBeInTheDocument();
  });

  it('does not show avatars for dashboard visitors (no activeDocKey)', () => {
    mockUseDocument.mockReturnValue(
      makeDocContext([{ docKey: 'demo', title: 'demo', createdAt: 1000 }]),
    );
    // User is on dashboard, no activeDocKey
    mockUsePresences.mockReturnValue([
      { clientID: 'b', presence: { name: '방문자', color: '#a855f7' } },
    ]);
    render(<DashboardDocList user={USER} />);
    expect(screen.queryByTitle('방문자')).toBeNull();
  });
});

describe('DashboardDocList — doc creation', () => {
  it('shows the inline input when "+ New Doc" is clicked', () => {
    mockUseDocument.mockReturnValue(makeDocContext([]));
    render(<DashboardDocList user={USER} />);
    fireEvent.click(screen.getByText('+ New Doc'));
    expect(screen.getByPlaceholderText('문서 제목 입력…')).toBeInTheDocument();
  });

  it('calls update and navigates on Enter with a non-empty title', () => {
    const updateFn = vi.fn();
    const root = { docs: [] as { docKey: string; title: string; createdAt: number }[] };
    const doc = { getRoot: () => root };
    mockUseDocument.mockReturnValue({ doc, loading: false, update: updateFn });

    render(<DashboardDocList user={USER} />);
    fireEvent.click(screen.getByText('+ New Doc'));
    const input = screen.getByPlaceholderText('문서 제목 입력…');
    fireEvent.change(input, { target: { value: '새 문서' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updateFn).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalled();
    const destination = mockPush.mock.calls[0][0] as string;
    expect(destination).toMatch(/^\/doc\/doc-/);
  });

  it('does not navigate when the title is empty and Escape is pressed', () => {
    mockUseDocument.mockReturnValue(makeDocContext([]));
    render(<DashboardDocList user={USER} />);
    fireEvent.click(screen.getByText('+ New Doc'));
    const input = screen.getByPlaceholderText('문서 제목 입력…');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(mockPush).not.toHaveBeenCalled();
    // Input should be gone after Escape.
    expect(screen.queryByPlaceholderText('문서 제목 입력…')).toBeNull();
  });
});
