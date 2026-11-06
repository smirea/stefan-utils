Manifest V3 browser extension built with WXT, React, and Tailwind.

- `src/entrypoints/background.ts`: service worker
- `src/entrypoints/content.ts`: content script for the pages it matches
- `src/entrypoints/popup/`: toolbar popup

```sh
bun install       # also installs the git hooks
bun run dev       # opens Chrome with the extension loaded, reloads on save
bun run build     # production build in .output/chrome-mv3
bun run zip       # Chrome Web Store package in .output/
```

To load a build by hand, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

`AGENTS.md` lists the stack and conventions.
