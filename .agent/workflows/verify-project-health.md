---
description: Steps to verify the project's health and stability
---

To ensure the project remains stable and free of type, lint, or build errors, follow these steps before merging any major changes.

## Automated Checks (Continuous Integration)

Every push to `main` or pull request triggers the **Project Health Check** on GitHub Actions. This workflow runs:

1. `npm run check`: Verifies Astro component types, ESLint rules, and Prettier formatting.
2. `npm run test`: Executes the verification suite (OG images, metadata, hreflang, links).
3. `npm run build`: Ensures the production build completes without errors.

## Local Verification (Pre-commit)

We use **Husky** and **lint-staged** to automatically lint and format files before they are committed.

- If you have errors that cannot be auto-fixed, the commit will fail.
- You should address these errors manually or fix the underlying issues.

## Manual Verification Command

Before submitting a PR, it is recommended to run the full verification locally:

```bash
// turbo
npm run check && npm run test && npm run build
```

This ensures that the CI will pass and that no regressions are introduced.
