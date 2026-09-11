# Development

```
npm install
npm run compile
```

Then Run → Start Debugging (or F5) to open an Extension Development Host.

## How it works

Everything load-bearing is in `package.json`. `src/extension.ts` does two things:

1. Registers an empty tree provider per container. Welcome content only renders for an *empty tree
   view*, so an unclaimed view id would not fall through to `viewsWelcome`.
2. Syncs `bento.names` into `package.nls.json` and prompts for a reload.

Container visibility is pure manifest: the optional containers' views carry
`when: "config.bento.groupN"`, and a container with no visible views drops out of the activity bar
on its own.

## Packaging

```
npx vsce package
```

Verify the `.vsix` contains `out/`, `media/`, and `package.nls.json`, and does *not* contain `src/`
or `node_modules/`.

## Notes

- `package.nls.json` must ship, or renaming silently no-ops.
- The rename path bumps `package.json`'s mtime to invalidate VS Code's parsed-manifest cache. If
  renaming stops working after a VS Code update, that cache key is the first thing to check.
