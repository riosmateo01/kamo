# Drop-in layout (after `create-next-app`)

```
monday-brief/
├── package.json
├── vitest.config.ts
├── ACCEPTANCE.md
├── FOLDER-LAYOUT.md
└── src/
    ├── app/                    # Next.js — leave alone for Spike 0
    ├── lib/
    │   ├── contracts/
    │   │   └── types.ts
    │   ├── fixtures/
    │   │   ├── harvest.json
    │   │   ├── qbo.json
    │   │   ├── mapping.json
    │   │   └── expected-pnl.json
    │   ├── connectors/
    │   │   ├── harvest/
    │   │   │   └── mock.ts     # reads harvest.json
    │   │   └── qbo/
    │   │       └── mock.ts     # reads qbo.json
    │   ├── mapping/
    │   │   └── resolve.ts
    │   ├── pnl/
    │   │   ├── reconcile.ts
    │   │   └── assert.ts       # tolerance compare
    │   └── brief/
    │       └── index.ts        # stub: export {}
    └── __tests__/
        └── reconcile.test.ts   # first test
```

## Setup commands
```bash
npx create-next-app@latest monday-brief --typescript --eslint --app --src-dir --import-alias "@/*"
cd monday-brief
npm i -D vitest
# copy this skeleton's src/lib, src/__tests__, vitest.config.ts, ACCEPTANCE.md into the repo
npm test
```
