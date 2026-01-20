# Link Checking Guide

This guide describes how to use the automated link checker and how to resolve issues it finds.

## Running the Checker

Ensure you have built the site first:

```bash
npm run build
```

```bash
npm run test:links
```

Or run the **full test suite** (Unit, OG images, Meta, Hreflang, E2E):

```bash
npm run test
```

The script scans the `dist/` directory, extracts links with context (line number and link text), and checks them.

## Interpreting the Report

The output will show broken links like this:

```text
https://example.com/broken-page
  Status: 404
  Found in:
    - dist/page.html:15 ["Link Text"]  <-- Source File : Approx Line Number ["Link Text"]
```

Use the **Link Text** to find the exact location in your source code.

## Fixing Broken Links

When the script reports broken links (non-200 status codes), follow these rules:

### 1. General Approach

- **Check the URL manually**: Sometimes it's a temporary glitch.
- **Search for content**: If the page is gone (404), search the target website for the same content at a new URL.

### 2. Old Pages (> 2 years)

If the broken link is on a page that is older than 2 years:

- **Do not simply delete the link text.**
- **Do not add new information** except a short note like `[Trasig länk]` _if_ the link was a standalone resource (e.g. in a list). If the link was part of a sentence, just remove the link tag.
- **Do not change anything else** on the page.
- Remove the `<a>` tag but **keep the original text**. The URL can be kept as an HTML comment.
- _Examples:_
  - _Standalone:_ `Results: Eventor [Trasig länk] <!-- http://... -->`
  - _Embedded:_ `We went to Stockholm <!-- http://maps... --> and had fun.`

### 3. New Pages (< 2 years)

If the broken link is on a new page:

- **Do NOT remove the link** without asking the content owner (or the User).
- **Google it**: Search for the page title or content to see if it has moved.
- Try to fix it (typo? moved?).

## Sampling Logic

The script groups similar links (e.g. `eventor/123` and `eventor/124`).

- If a group has > 5 links, it checks the **first**, **last**, and **3 random** items.

## Skipped Domains

The script skips network checks for:

- **Facebook / Instagram**: (Blocks scrapers, assumed valid if format is correct)
- **Pixieset**: (Protected by Cloudflare Challenge)
- **LinkedIn**

These will show as `Skipped` in the logs or not appear in the broken report unless malformed.

## Tricks for Diagnosing 403s

If a link works in the browser but fails in the script (403 or 404):

1. **HEAD vs GET**: Some servers (like `oringen.se` or `vasaloppet.se`) block `HEAD` requests or treat them differently. The script has a `FORCE_GET_HOSTS` list to handle this.
2. **Headers**: Some servers require `User-Agent` or `Accept` headers to look like a real browser.
