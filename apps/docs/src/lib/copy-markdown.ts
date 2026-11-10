type ClipboardWriter = {
  write?: Clipboard["write"];
  writeText: Clipboard["writeText"];
};

type ClipboardItemConstructor = new (
  items: Record<string, string | Blob | PromiseLike<string | Blob>>,
) => ClipboardItem;

type CopyMarkdownDependencies = {
  clipboard?: ClipboardWriter;
  clipboardItem?: ClipboardItemConstructor;
  fetcher?: typeof fetch;
};

export async function copyMarkdownToClipboard(
  markdownUrl: string,
  dependencies: CopyMarkdownDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;
  const clipboard = dependencies.clipboard ?? navigator.clipboard;
  const ClipboardItemClass =
    dependencies.clipboardItem ?? globalThis.ClipboardItem;
  const markdown = fetcher(markdownUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load Markdown: ${response.status}`);
    }

    return response.text();
  });

  if (ClipboardItemClass && clipboard.write) {
    const item = new ClipboardItemClass({ "text/plain": markdown });
    await Promise.all([clipboard.write([item]), markdown]);
    return;
  }

  await clipboard.writeText(await markdown);
}
