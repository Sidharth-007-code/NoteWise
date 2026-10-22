import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const markdownComponents = {
  table: ({ children }) => (
    <div className="markdown-table-scroll">
      <table>{children}</table>
    </div>
  ),
};

export function normalizeMarkdownAnswer(value) {
  return String(value || '').replace(/<br\s*\/?\s*>/gi, '  \n');
}

export default function MarkdownAnswer({ children }) {
  return (
    <div className="markdown-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {normalizeMarkdownAnswer(children)}
      </ReactMarkdown>
    </div>
  );
}
