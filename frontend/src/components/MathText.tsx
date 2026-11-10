
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./MathText.css";

type MathTextProps = {
  children?: React.ReactNode;
  className?: string;
};

function normalizeMathDelimiters(text: string): string {
  return text
    // Convert \[ ... \] into display math.
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, equation: string) => {
      return `$$\n${equation}\n$$`;
    })
    // Convert \( ... \) into inline math.
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, equation: string) => {
      return `$${equation}$`;
    });
}

export default function MathText({
  children,
  className = "",
}: MathTextProps) {
  const content =
    typeof children === "string"
      ? children
      : typeof children === "number"
        ? String(children)
        : "";

  return (
    <div className={`math-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
}
