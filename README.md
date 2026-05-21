# bun project template

<p align="center">
  <a href="https://bun.com"><img src="https://github.com/user-attachments/assets/50282090-adfd-4ddb-9e27-c30753c6b161" alt="Logo" height=170></a>
</p>

To create a new repo with this project template using the gh cli:

```bash
gh repo create $PROJECT_NAME --template jeffgca/bun-tpl --private --clone'
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To run tests:

```bash
bun test
```

To compare `bun-functional-tests` results between stable Bun and Canary Bun:

```bash
bun run compare:bun-versions
```

This will:
- install stable Bun into `.bun-compare-workspace/bun-stable`
- install canary Bun into `.bun-compare-workspace/bun-canary` by running `bun upgrade --canary` with the stable Bun binary
- clone (or update) `https://github.com/jeffgca/bun-functional-tests.git`
- run install + tests for each Bun binary
- write a JSON comparison report to `.bun-compare-workspace/comparison-report.json`

Useful overrides:

```bash
bun run compare:bun-versions -- --workspace /tmp/bun-compare --testArg test --testArg --bail
```

To compile to a standalone binary:

```bash
bun cc
```
