import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePresences = vi.hoisted(() => vi.fn());
const mockUseConnection = vi.hoisted(() => vi.fn());
const mockUseDocument = vi.hoisted(() => vi.fn());

vi.mock('@yorkie-js/react', () => ({
  usePresences: mockUsePresences,
  useConnection: mockUseConnection,
  useDocument: mockUseDocument,
  StreamConnectionStatus: { Connected: 'connected', Disconnected: 'disconnected' },
}));

import PresenceBar from '@/components/PresenceBar';

describe('T2-1: PresenceBar renders presence chips', () => {
  beforeEach(() => {
    mockUseDocument.mockReturnValue({ loading: false });
    mockUseConnection.mockReturnValue('connected');
  });

  it('renders a chip per presence with name and its color', () => {
    mockUsePresences.mockReturnValue([
      { clientID: 'a', presence: { name: '재훈', color: '#0ea5e9' } },
      { clientID: 'b', presence: { name: '동현', color: '#f97316' } },
    ]);
    render(<PresenceBar />);

    const jaehoon = screen.getByText('재훈');
    const donghyun = screen.getByText('동현');
    expect(jaehoon).toBeInTheDocument();
    expect(donghyun).toBeInTheDocument();
    expect(jaehoon).toHaveStyle({ backgroundColor: '#0ea5e9' });
    expect(donghyun).toHaveStyle({ backgroundColor: '#f97316' });
  });

  it('renders nothing in the list when there are no presences', () => {
    mockUsePresences.mockReturnValue([]);
    render(<PresenceBar />);
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});

describe('T2-2: PresenceBar connection badge', () => {
  beforeEach(() => {
    mockUsePresences.mockReturnValue([]);
  });

  it('shows "연결됨" when connected and not loading', () => {
    mockUseDocument.mockReturnValue({ loading: false });
    mockUseConnection.mockReturnValue('connected');
    render(<PresenceBar />);
    expect(screen.getByText('연결됨')).toBeInTheDocument();
  });

  it('shows "연결 끊김" when disconnected and not loading', () => {
    mockUseDocument.mockReturnValue({ loading: false });
    mockUseConnection.mockReturnValue('disconnected');
    render(<PresenceBar />);
    expect(screen.getByText('연결 끊김')).toBeInTheDocument();
  });

  it('shows "연결 중…" while the document is loading', () => {
    mockUseDocument.mockReturnValue({ loading: true });
    mockUseConnection.mockReturnValue('disconnected');
    render(<PresenceBar />);
    expect(screen.getByText('연결 중…')).toBeInTheDocument();
  });
});
