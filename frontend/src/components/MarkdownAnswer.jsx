
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './MarkdownAnswer.css';

function normalizeMathDelimiters(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    // Convert \[ ... \] to display math.
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, equation) => {
      return `$$\n${equation}\n$$`;
    })
    // Convert \( ... \) to inline math.
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, equation) => {
      return `$${equation}$`;
    });
}

export default function MarkdownAnswer({ children, className = '' }) {
  const content = normalizeMathDelimiters(
    typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : ''
  );

  return (
    <div className={`markdown-answer min-w-0 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ children: linkChildren, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8fbdff] underline break-words"
            >
              {linkChildren}
            </a>
          ),
          pre: ({ children: codeChildren }) => (
            <pre className="max-w-full overflow-x-auto rounded-lg bg-[#10131c] border border-[#464554]/40 p-3 my-3">
              {codeChildren}
            </pre>
          ),
          code: ({ children: codeChildren, className: codeClassName }) => (
            <code
              className={`${codeClassName || ''} rounded ${
                codeClassName ? '' : 'bg-[#10131c] px-1 py-0.5'
              }`}
            >
              {codeChildren}
            </code>
          ),
          table: ({ children: tableChildren }) => (
            <div className="max-w-full overflow-x-auto my-3">
              <table className="w-full border-collapse text-left">
                {tableChildren}
              </table>
            </div>
          ),
          th: ({ children: cellChildren }) => (
            <th className="border border-[#464554]/50 bg-[#303343] px-2 py-1.5 font-semibold">
              {cellChildren}
            </th>
          ),
          td: ({ children: cellChildren }) => (
            <td className="border border-[#464554]/40 px-2 py-1.5">
              {cellChildren}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
