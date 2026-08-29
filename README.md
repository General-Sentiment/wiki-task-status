# Wiki Task Status

Wiki Task Status is an Obsidian plugin that turns a standalone wikilink to a task note into a checkbox. The checkbox always reflects the linked note's `done` property, so a task can appear in many notes without duplicating its state.

```md
[[Renew car registration]]
```

In Reading view, the link above renders like a native Obsidian task:

```md
- [ ] Renew car registration
```

Checking it completes the linked task note. Every other standalone reference to that note reflects the change.

## How task notes are recognized

A linked Markdown note is treated as a task when either:

- it is inside the vault's `todo/` folder, or
- its `categories` frontmatter includes `[[Todo]]`.

For example:

```yaml
---
categories:
  - "[[Todo]]"
done:
---
```

An empty `done` property means the task is open. A non-empty value means it is complete. Checking a rendered task writes a local timestamp such as `2026-08-28T14:30:00`; unchecking it clears the property.

## Standalone links only

The plugin intentionally transforms a wikilink only when it is the sole content of a paragraph:

```md
[[Renew car registration]]
```

Links within prose are left alone:

```md
Remember to handle [[Renew car registration]] this week.
```

Links to notes that do not match the task-note convention are also left alone.

## View support

The checkbox appears in Reading view. Source mode and Live Preview continue to display the original wikilink, keeping the Markdown portable and straightforward to edit.

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create a folder named `wiki-task-status` inside your vault's `.obsidian/plugins/` directory.
3. Copy the three files into that folder.
4. In Obsidian, open **Settings → Community plugins**, reload installed plugins, and enable **Wiki Task Status**.

### From source

Clone this repository into your vault's plugin directory:

```sh
git clone https://github.com/general-sentiment/wiki-task-status.git \
  /path/to/vault/.obsidian/plugins/wiki-task-status
```

Then reload installed plugins and enable **Wiki Task Status** in Obsidian.

## Privacy

Wiki Task Status runs entirely inside Obsidian. It makes no network requests and collects no data.

## License

[MIT](LICENSE)
