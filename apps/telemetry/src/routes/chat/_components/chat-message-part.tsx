import type { UIMessage } from "@backend/llms/uiMessage.js";
import { useSmoothText } from "@convex-dev/agent/react";
import { getToolName, isToolUIPart } from "ai";
import { type ComponentPropsWithoutRef, useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeReact from "rehype-react";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { MimeTypeIcon } from "@/routes/context/_components/mime-type-icon";

const assistantMarkdown = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeReact, {
    Fragment,
    jsx,
    jsxs,
    development: false,
    elementAttributeNameCase: "react",
    components: {
      a: (props: ComponentPropsWithoutRef<"a">) => (
        <a
          className="text-primary font-medium underline underline-offset-2"
          rel="noopener noreferrer"
          target="_blank"
          {...props}
        />
      ),
      blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
        <blockquote
          className="border-muted-foreground/40 text-muted-foreground mb-2 border-l-2 pl-3 italic last:mb-0"
          {...props}
        />
      ),
      code: ({ className, ...props }: ComponentPropsWithoutRef<"code">) => {
        const block =
          typeof className === "string" && className.includes("language-");
        return (
          <code
            className={
              block
                ? `block font-mono text-xs ${className ?? ""}`
                : "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
            }
            {...props}
          />
        );
      },
      h1: (props: ComponentPropsWithoutRef<"h1">) => (
        <h1 className="mb-2 text-lg font-semibold last:mb-0" {...props} />
      ),
      h2: (props: ComponentPropsWithoutRef<"h2">) => (
        <h2 className="mb-2 text-base font-semibold last:mb-0" {...props} />
      ),
      h3: (props: ComponentPropsWithoutRef<"h3">) => (
        <h3 className="mb-1.5 text-sm font-semibold last:mb-0" {...props} />
      ),
      hr: (props: ComponentPropsWithoutRef<"hr">) => (
        <hr className="border-border my-3" {...props} />
      ),
      li: (props: ComponentPropsWithoutRef<"li">) => (
        <li className="leading-relaxed" {...props} />
      ),
      ol: (props: ComponentPropsWithoutRef<"ol">) => (
        <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />
      ),
      p: (props: ComponentPropsWithoutRef<"p">) => (
        <p className="mb-2 text-sm leading-relaxed last:mb-0" {...props} />
      ),
      pre: (props: ComponentPropsWithoutRef<"pre">) => (
        <pre
          className="bg-muted mb-2 overflow-x-auto rounded-md p-3 text-sm last:mb-0"
          {...props}
        />
      ),
      strong: (props: ComponentPropsWithoutRef<"strong">) => (
        <strong className="font-semibold" {...props} />
      ),
      ul: (props: ComponentPropsWithoutRef<"ul">) => (
        <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />
      ),
    },
  });

function AssistantTextPart({
  text,
  streaming,
}: {
  text: string;
  streaming: boolean;
}) {
  const [visible] = useSmoothText(text, { startStreaming: streaming });
  const rendered = useMemo(() => {
    try {
      return assistantMarkdown.processSync(visible).result;
    } catch {
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{visible}</p>
      );
    }
  }, [visible]);
  return <div className="min-w-0 text-sm">{rendered}</div>;
}

export function ChatMessagePart({
  part,
  role,
  messageStatus,
}: {
  part: UIMessage["parts"][number];
  role: UIMessage["role"];
  messageStatus: UIMessage["status"];
}) {
  const streaming = messageStatus === "streaming";

  switch (part.type) {
    case "text":
      if (role === "assistant") {
        return <AssistantTextPart text={part.text} streaming={streaming} />;
      }
      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {part.text}
        </p>
      );
    case "reasoning":
      return part.text ? (
        <Item size="sm" variant="muted" className="text-xs">
          <ItemContent>
            <ItemTitle className="text-muted-foreground">Reasoning</ItemTitle>
            <ItemDescription className="font-mono text-[11px]">
              {part.text}
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null;
    case "source-url":
      return (
        <Item size="sm" variant="outline">
          <ItemContent>
            <ItemTitle className="text-xs">Source</ItemTitle>
            <ItemDescription className="truncate">
              {String(part.title ?? part.url)}
            </ItemDescription>
          </ItemContent>
        </Item>
      );
    case "source-document":
      return (
        <Item size="sm" variant="outline">
          <ItemContent>
            <ItemTitle className="text-xs">Document</ItemTitle>
            <ItemDescription className="truncate">{part.title}</ItemDescription>
          </ItemContent>
        </Item>
      );
    case "file": {
      const name = part.filename ?? part.mediaType ?? "file";
      return (
        <Item size="sm" variant="outline" className="gap-2">
          <MimeTypeIcon
            mimeType={part.mediaType ?? undefined}
            className="size-4 shrink-0"
          />
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-xs font-medium">
              {name}
            </ItemTitle>
          </ItemContent>
        </Item>
      );
    }
    case "dynamic-tool": {
      const label =
        part.state === "output-available"
          ? "Tool result"
          : part.state === "output-error"
            ? "Tool error"
            : "Tool call";
      return (
        <Item size="sm" variant="outline">
          <ItemContent className="min-w-0 gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {part.toolName}
              </Badge>
              <span className="text-muted-foreground text-xs">{label}</span>
            </span>
            <ItemDescription className="break-all font-mono text-[11px]">
              {part.state === "input-streaming" ||
              part.state === "input-available"
                ? JSON.stringify(part.input ?? {})
                : part.state === "output-available"
                  ? JSON.stringify(part.output)
                  : part.errorText}
            </ItemDescription>
          </ItemContent>
        </Item>
      );
    }
    case "step-start":
      return null;
    default:
      if (isToolUIPart(part)) {
        const toolName = getToolName(part);
        const label =
          part.state === "output-available"
            ? "Tool result"
            : part.state === "output-error"
              ? "Tool error"
              : "Tool call";
        return (
          <Item size="sm" variant="outline">
            <ItemContent className="min-w-0 gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {toolName}
                </Badge>
                <span className="text-muted-foreground text-xs">{label}</span>
              </span>
              <ItemDescription className="break-all font-mono text-[11px]">
                {part.state === "input-streaming" ||
                part.state === "input-available"
                  ? JSON.stringify(part.input ?? {})
                  : part.state === "output-available"
                    ? JSON.stringify(part.output)
                    : part.errorText}
              </ItemDescription>
            </ItemContent>
          </Item>
        );
      }
      if (part.type.startsWith("data-")) {
        const data = "data" in part ? part.data : undefined;
        return (
          <Item size="sm" variant="muted">
            <ItemDescription className="font-mono text-[11px]">
              data · {JSON.stringify(data)}
            </ItemDescription>
          </Item>
        );
      }
      return null;
  }
}
