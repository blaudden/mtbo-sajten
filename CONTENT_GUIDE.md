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
