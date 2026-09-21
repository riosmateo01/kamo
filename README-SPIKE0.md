# Spike 0 skeleton — copy into your Next app

1. `npx create-next-app@latest monday-brief --typescript --eslint --app --src-dir --import-alias "@/*"`
2. `cd monday-brief && npm i -D vitest`
3. Merge `package.snippet.json` scripts into your `package.json`
4. Ensure `tsconfig.json` has `resolveJsonModule: true` (see `tsconfig.snippet.json`)
5. Copy `src/lib` and `src/__tests__` and `vitest.config.ts` into the repo root
6. `npm test`

Mocks + mapping + reconciler are filled so the first test can pass. Read `fixtures/WALKTHROUGH.md` if anything fails. Stub `brief/` on purpose.
