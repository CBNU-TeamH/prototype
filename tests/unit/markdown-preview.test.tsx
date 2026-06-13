import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseDocument = vi.hoisted(() => vi.fn());

vi.mock('@yorkie-js/react', () => ({
  useDocument: mockUseDocument,
}));

import MarkdownPreview from '@/components/MarkdownPreview';

describe('T3-4: MarkdownPreview renders the document content as markdown', () => {
  beforeEach(() => {
    mockUseDocument.mockReset();
  });

  it('renders a heading and bold text from the content string', () => {
    mockUseDocument.mockReturnValue({
      root: { content: { toString: () => '# 회의록\n\n**굵게**' } },
    });
    render(<MarkdownPreview />);

    expect(screen.getByRole('heading', { name: '회의록' })).toBeInTheDocument();
    const bold = screen.getByText('굵게');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders nothing fatal when content is absent', () => {
    mockUseDocument.mockReturnValue({ root: {} });
    const { container } = render(<MarkdownPreview />);
    expect(container.querySelector('.markdown-preview')).not.toBeNull();
  });

  it('renders a single newline as a line break (remark-breaks)', () => {
    mockUseDocument.mockReturnValue({
      root: { content: { toString: () => '첫째 줄\n둘째 줄' } },
    });
    const { container } = render(<MarkdownPreview />);

    expect(container.querySelector('br')).not.toBeNull();
    expect(screen.getByText(/첫째 줄/)).toBeInTheDocument();
    expect(screen.getByText(/둘째 줄/)).toBeInTheDocument();
  });
});
