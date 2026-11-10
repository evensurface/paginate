"use client";

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import {
  Bot,
  ChevronDown,
  ExternalLinkIcon,
  Sparkles,
  TextIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type ViewOptionsPopoverProps = ComponentProps<typeof PopoverTrigger> & {
  markdownUrl?: string;
  pageUrl: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ViewOptionsPopover({
  markdownUrl,
  pageUrl,
  ...props
}: ViewOptionsPopoverProps) {
  const prompt = `Read ${pageUrl}, I want to ask questions about it.`;
  const items: Array<{
    title: string;
    href: string;
    icon: ReactNode;
  }> = [
    ...(markdownUrl
      ? [
          {
            title: "View as Markdown",
            href: markdownUrl,
            icon: <TextIcon />,
          },
        ]
      : []),
    {
      title: "Open in Scira AI",
      href: `https://scira.ai/?${new URLSearchParams({ q: prompt })}`,
      icon: <Sparkles />,
    },
    {
      title: "Open in ChatGPT",
      href: `https://chatgpt.com/?${new URLSearchParams({
        prompt,
        hints: "search",
      })}`,
      icon: <Bot />,
    },
    {
      title: "Open in Claude",
      href: `https://claude.ai/new?${new URLSearchParams({ q: prompt })}`,
      icon: <Bot />,
    },
    {
      title: "Open in Cursor",
      href: `https://cursor.com/link/prompt?${new URLSearchParams({
        text: prompt,
      })}`,
      icon: <Bot />,
    },
  ];

  return (
    <Popover>
      <PopoverTrigger
        {...props}
        className={(state) =>
          cx(
            buttonVariants({
              color: "secondary",
              size: "sm",
            }),
            "gap-2 data-[popup-open]:bg-fd-accent data-[popup-open]:text-fd-accent-foreground",
            typeof props.className === "function"
              ? props.className(state)
              : props.className,
          )
        }
      >
        {props.children ?? "Open"}
        <ChevronDown className="size-3.5 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item) => (
          <a
            href={item.href}
            rel="noreferrer noopener"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-fd-accent hover:text-fd-accent-foreground [&_svg]:size-4"
            key={item.href}
          >
            {item.icon}
            {item.title}
            <ExternalLinkIcon className="ms-auto size-3.5 text-fd-muted-foreground" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
