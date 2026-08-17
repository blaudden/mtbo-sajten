# Content Creation Guide

This guide explains special features available when writing content for the site.

## Smart Resource Lists

The site includes a "Smart Resource List" feature that automatically styles lists of links to resources like maps, events, and external tools.

### How it works

When you create a standard Markdown list that contains links to specific resources, the site automatically detects them and transforms the list into a visual card style with icons.

### Supported Resources

The following link types are automatically detected:

- **PDF Files** (`.pdf`): Displays a PDF icon.
- **Livelox** (`livelox.com`): Displays the Livelox logo/icon.
- **Eventor** (`eventor.orientering.se`): Displays a calendar event icon.
- **External Links**: Displays an external link icon.

### Usage

Simply create a bulleted list of links in your Markdown content:

```markdown
- [Map of Area 1](assets/map1.pdf)
- [Livelox Replay](https://www.livelox.com/...)
- [Event Info on Eventor](https://eventor.orientering.se/...)
```

The system will automatically apply the styling, icons, and ensure these links open in a new tab. No special components or shortcodes are required.

## Images & Media Guidelines

When creating or adding new images for articles, events, or site pages, follow these rules to optimize performance and consistency:

- **Hero Images Aspect Ratio**: Blog post hero images must use a 16:9 aspect ratio (recommended size: `1280x720`).
- **File Size Threshold**: Every image must be optimized to keep file sizes under **800 KB (0.8 MB)**.
- **Optimization Command**: Always run `npm run optimize-images` before committing new or modified images. This script automatically resizes images wider than 1920px and compresses JPEG/PNG/WebP files.
- **Validation Command**: Run `npm run validate:images` to check hero image aspect ratio compliance.
