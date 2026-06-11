import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Hello({ name }: { name: string }) {
  return <p>Hello, {name}!</p>;
}

describe('T0-1: RTL smoke', () => {
  it('renders text and jest-dom matcher works', () => {
    render(<Hello name="World" />);
    const el = screen.getByText('Hello, World!');
    expect(el).toBeInTheDocument();
  });
});
