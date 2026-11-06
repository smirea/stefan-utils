# Stack

- Tooling: Bun + TypeScript
- Extension framework: WXT (Manifest V3), configured in `wxt.config.ts`
- UI: React + Tailwind CSS (enabled in `src/entrypoints/popup/index.css`)
- Linting and Hooks: Oxlint + Lefthook

# Structure and commands

- Each file or folder in `src/entrypoints/` is one extension entrypoint; WXT derives the manifest from them. `background.ts` is the service worker, `content.ts` runs on its `matches`, and `popup/` is the toolbar popup. Add entrypoints by WXT's naming rules (options, side panel, new tab, and more) instead of editing a manifest file.
- Static manifest fields and permissions live in `wxt.config.ts` under `manifest`. The name and version come from `package.json`. Request only the permissions and host matches a feature needs; broad ones slow Chrome Web Store review.
- Import WXT APIs explicitly (`wxt/browser`, `wxt/utils/define-background`, `wxt/utils/storage`, ...). Auto-imports are off.
- `bun run dev` builds into `.output/chrome-mv3-dev`, opens Chrome with the extension loaded, and reloads it on save. The dev profile persists in `.wxt/chrome-data`. `bun run dev:firefox` does the same for Firefox.
- `bun run build` writes the production extension to `.output/chrome-mv3`; `bun run zip` packages it for the Chrome Web Store.
- `wxt prepare` runs on install and regenerates `.wxt/`, which `tsconfig.json` extends. Rerun `bun install` if types under `.wxt/` are missing.

# Verifying changes

- Run `bun run dev` and use the extension in the Chrome window it opens: open the popup from the toolbar's extensions menu, visit a page the content script matches, and read the service worker's console from `chrome://extensions`.
- A build that loads proves only that the manifest is valid. Exercise the changed behavior in the browser before calling it done.
