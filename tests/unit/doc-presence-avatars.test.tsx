import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import DocPresenceAvatars from '@/components/DocPresenceAvatars';

describe('T-DocAvatar: DocPresenceAvatars renders initials avatars', () => {
  it('renders an avatar per participant with initial, title and background color', () => {
    render(
      <DocPresenceAvatars
        participants={[
          { clientID: 'a', name: '재훈', color: '#0ea5e9' },
          { clientID: 'b', name: '동현', color: '#f97316' },
        ]}
      />,
    );

    const jaehoon = screen.getByTitle('재훈');
    const donghyun = screen.getByTitle('동현');
    expect(jaehoon).toBeInTheDocument();
    expect(donghyun).toBeInTheDocument();
    expect(jaehoon).toHaveTextContent('재');
    expect(donghyun).toHaveTextContent('동');
    expect(jaehoon).toHaveStyle({ backgroundColor: '#0ea5e9' });
    expect(donghyun).toHaveStyle({ backgroundColor: '#f97316' });
  });

  it('renders nothing when the participants list is empty', () => {
    const { container } = render(<DocPresenceAvatars participants={[]} />);
    expect(container.querySelector('.doc-avatar')).toBeNull();
  });

  it('skips items with no name rather than crashing', () => {
    // Should not throw even when name is empty string.
    const { container } = render(
      <DocPresenceAvatars
        participants={[
          { clientID: 'a', name: '', color: '#0ea5e9' },
          { clientID: 'b', name: '동현', color: '#f97316' },
        ]}
      />,
    );
    // The second item should still render.
    expect(screen.getByTitle('동현')).toBeInTheDocument();
    // The first item renders with an empty initial but must not crash.
    expect(container.querySelector('.doc-avatars')).toBeInTheDocument();
  });
});
