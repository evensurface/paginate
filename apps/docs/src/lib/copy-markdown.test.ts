import { describe, expect, it, vi } from "vitest";
import { copyMarkdownToClipboard } from "./copy-markdown";

function response(body: string, status = 200) {
  return new Response(body, { status });
}

describe("copyMarkdownToClipboard", () => {
  it("writes a ClipboardItem when the rich clipboard API is available", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(response("# Paginate"));
    const clipboardItem = vi.fn(function ClipboardItem(
      this: {
        items: Record<string, PromiseLike<string | Blob> | string | Blob>;
      },
      items: Record<string, PromiseLike<string | Blob> | string | Blob>,
    ) {
      this.items = items;
    });

    await copyMarkdownToClipboard("/page.md", {
      clipboard: { write, writeText },
      clipboardItem: clipboardItem as never,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledWith("/page.md");
    expect(clipboardItem).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    await expect(
      clipboardItem.mock.calls[0]?.[0]?.["text/plain"],
    ).resolves.toBe("# Paginate");
  });

  it("falls back to writeText when ClipboardItem is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await copyMarkdownToClipboard("/page.md", {
      clipboard: { writeText },
      fetcher: vi.fn().mockResolvedValue(response("# Paginate")),
    });

    expect(writeText).toHaveBeenCalledWith("# Paginate");
  });

  it("does not write when loading the Markdown fails", async () => {
    const writeText = vi.fn();

    await expect(
      copyMarkdownToClipboard("/missing.md", {
        clipboard: { writeText },
        fetcher: vi.fn().mockResolvedValue(response("Missing", 404)),
      }),
    ).rejects.toThrow("Failed to load Markdown: 404");
    expect(writeText).not.toHaveBeenCalled();
  });
});
