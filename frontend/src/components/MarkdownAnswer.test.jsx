import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import MarkdownAnswer, { normalizeMarkdownAnswer } from './MarkdownAnswer';

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: jest.fn(({ children }) => children),
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: 'gfm-plugin' }));
jest.mock('remark-math', () => ({ __esModule: true, default: 'math-plugin' }));
jest.mock('rehype-katex', () => ({ __esModule: true, default: 'katex-plugin' }));

test('configures GFM tables and math for the multi-table quantifier answer', () => {
  const answer = `## Quantifiers\n\n| Symbol | Meaning |\n|:--|--:|\n| **∀x** | all x |\n| ∃x | some x |\n\n| Rule | Equivalent form |\n| --- | --- |\n| Negation | $\\neg \\forall x P(x) \\equiv \\exists x \\neg P(x)$ |\n\n- **Universal** quantifier\n- Existential quantifier\n\n\`\`\`text\n∀x P(x)\n\`\`\``;
  renderToStaticMarkup(<MarkdownAnswer>{answer}</MarkdownAnswer>);
  expect((answer.match(/^\|.*\|$/gm) || []).length).toBeGreaterThan(6);
  const configuration = ReactMarkdown.mock.calls.at(-1)[0];
  expect(configuration.remarkPlugins).toEqual(['gfm-plugin', 'math-plugin']);
  expect(configuration.rehypePlugins).toEqual(['katex-plugin']);
  expect(configuration.components.table).toBeDefined();
  const table = renderToStaticMarkup(configuration.components.table({ children: <table><tbody><tr><td>∀</td></tr></tbody></table> }));
  expect(table).toContain('markdown-table-scroll');
  expect(table).toContain('<table>');
});

test('converts literal break tags into Markdown line breaks', () => {
  expect(normalizeMarkdownAnswer('First line<br>Second line')).toBe('First line  \nSecond line');
});
