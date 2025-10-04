"use client";

import { memo, useMemo } from "react";
import type { ReactNode } from "react";

type MarkdownBlock =
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "code"; content: string };

type MiniMarkdownProps = {
  content: string;
  className?: string;
};

const inlinePattern =
  /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  if (!text) {
    return [];
  }

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  const regex = new RegExp(inlinePattern);

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      nodes.push(
        <span key={`${keyPrefix}-text-${nodes.length}`}>
          {text.slice(lastIndex, matchIndex)}
        </span>,
      );
    }

    if (match[2]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${nodes.length}`}>
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${nodes.length}`}>
          {match[3]}
        </strong>,
      );
    } else if (match[4]) {
      nodes.push(
        <em key={`${keyPrefix}-em-${nodes.length}`}>
          {match[4]}
        </em>,
      );
    } else if (match[5]) {
      nodes.push(
        <em key={`${keyPrefix}-em-${nodes.length}`}>
          {match[5]}
        </em>,
      );
    } else if (match[6]) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${nodes.length}`}
          className="rounded bg-black/10 px-1 py-0.5 text-[0.85em]"
        >
          {match[6]}
        </code>,
      );
    } else if (match[7] && match[8]) {
      const label = match[7];
      const href = match[8];
      nodes.push(
        <a
          key={`${keyPrefix}-link-${nodes.length}`}
          href={href}
          className="underline underline-offset-2 hover:opacity-80"
          target="_blank"
          rel="noreferrer"
        >
          {label}
        </a>,
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`${keyPrefix}-text-${nodes.length}`}>
        {text.slice(lastIndex)}
      </span>,
    );
  }

  return nodes;
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: MarkdownBlock[] = [];

  let paragraphLines: string[] | null = null;
  let listBlock: { type: "ul" | "ol"; items: string[] } | null = null;
  let blockquoteLines: string[] | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines && paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paragraphLines });
    }
    paragraphLines = null;
  };

  const flushList = () => {
    if (listBlock && listBlock.items.length > 0) {
      blocks.push({ type: listBlock.type, items: listBlock.items });
    }
    listBlock = null;
  };

  const flushBlockquote = () => {
    if (blockquoteLines && blockquoteLines.length > 0) {
      blocks.push({ type: "blockquote", lines: blockquoteLines });
    }
    blockquoteLines = null;
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushBlockquote();
  };

  for (const rawLine of lines) {
    const line = rawLine;
    const trimmed = line.trim();

    if (trimmed.startsWith("```") && !inCodeBlock) {
      flushAll();
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    if (trimmed.startsWith("```") && inCodeBlock) {
      blocks.push({ type: "code", content: codeLines.join("\n") });
      inCodeBlock = false;
      codeLines = [];
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushAll();
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushBlockquote();
      if (!listBlock || listBlock.type !== "ul") {
        flushList();
        listBlock = { type: "ul", items: [] };
      }
      listBlock.items.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushBlockquote();
      if (!listBlock || listBlock.type !== "ol") {
        flushList();
        listBlock = { type: "ol", items: [] };
      }
      listBlock.items.push(orderedMatch[2]);
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      flushList();
      if (!blockquoteLines) {
        blockquoteLines = [];
      }
      blockquoteLines.push(blockquoteMatch[1]);
      continue;
    }

    flushList();
    flushBlockquote();
    if (!paragraphLines) {
      paragraphLines = [];
    }
    paragraphLines.push(trimmed);
  }

  if (inCodeBlock) {
    blocks.push({ type: "code", content: codeLines.join("\n") });
  }

  flushAll();

  return blocks;
}

const MiniMarkdown = memo(function MiniMarkdown({ content, className }: MiniMarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  if (!content.trim()) {
    return null;
  }

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.type === "paragraph") {
          return (
            <p key={key} className="mb-2 leading-relaxed last:mb-0">
              {block.lines.map((line, lineIndex) => (
                <span key={`${key}-line-${lineIndex}`}>
                  {renderInline(line, `${key}-line-${lineIndex}`)}
                  {lineIndex < block.lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={key} className="mb-2 list-disc pl-5 last:mb-0">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-item-${itemIndex}`} className="mb-1">
                  {renderInline(item, `${key}-item-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={key} className="mb-2 list-decimal pl-5 last:mb-0">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-item-${itemIndex}`} className="mb-1">
                  {renderInline(item, `${key}-item-${itemIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={key}
              className="mb-2 border-l-4 border-[var(--baby-secondary-200)] pl-3 italic text-[var(--dreambaby-muted)] last:mb-0"
            >
              {block.lines.map((line, lineIndex) => (
                <span key={`${key}-line-${lineIndex}`}>
                  {renderInline(line, `${key}-line-${lineIndex}`)}
                  {lineIndex < block.lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={key}
              className="mb-2 overflow-x-auto rounded-md bg-slate-900 px-3 py-2 text-slate-100 last:mb-0"
            >
              <code className="text-xs leading-relaxed">{block.content}</code>
            </pre>
          );
        }

        return null;
      })}
    </div>
  );
});

MiniMarkdown.displayName = "MiniMarkdown";

export { MiniMarkdown };
