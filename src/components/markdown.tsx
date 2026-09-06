'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Children, isValidElement, type ReactNode } from 'react';
import { CopyButton } from './ui';
function getText(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) =>
      typeof c === 'string' || typeof c === 'number'
        ? String(c)
        : isValidElement<{ children?: ReactNode }>(c)
          ? getText(c.props.children)
          : '',
    )
    .join('');
}
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }) {
            const content = getText(children);
            return (
              <div className="code-block">
                <div className="code-head">
                  <span>CODE</span>
                  <CopyButton text={content} />
                </div>
                <pre>{children}</pre>
              </div>
            );
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img() {
            return <span className="muted">[External image omitted for privacy]</span>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
