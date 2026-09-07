# Wiki Task Status

Wiki Task Status turns a standalone wikilink to a task note into a checkbox. The checkbox reads and writes one property on the linked note, so the task can appear in many notes without duplicating its state.

```md
[[Renew car registration]]
```

In Reading view and Live Preview, that link renders like an Obsidian task. Checking it completes the linked note, and every other standalone reference reflects the change.

## Task notes

By default, a linked note is a task when its frontmatter contains a `done` property:

```yaml
---
done:
---
```

- An empty `done` property means the task is open.
- Any value in `done` means the task is complete.
- Checking a task writes a local timestamp such as `2026-08-28T14:30:00`.
- Unchecking a task clears the property.

That is the entire convention. Folder location, tags, categories, and note contents do not matter.

## Choose another property

Open **Settings → Community plugins → Wiki Task Status** and change **Task property**. For example, set it to `completed` to use:

```yaml
---
completed:
---
```

## Standalone links only

The wikilink must be the only content in its paragraph:

```md
[[Renew car registration]]
```

Links within prose remain ordinary links:

```md
Remember to handle [[Renew car registration]] this week.
```

Links to notes without the configured property also remain ordinary links.

## View support

The checkbox appears in Reading view and Live Preview. Live Preview keeps the original wikilink editable while displaying the synthetic checkbox beside it. Source mode continues to display only the original wikilink, keeping the Markdown portable and easy to edit.

## Installation

### Community plugins

Once the plugin is accepted into Obsidian's community directory, install it from **Settings → Community plugins → Browse**.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create `.obsidian/plugins/wiki-task-status/` inside your vault.
3. Copy the three files into that folder.
4. Reload installed plugins and enable **Wiki Task Status**.

## Privacy

Wiki Task Status runs entirely inside Obsidian. It makes no network requests and collects no data.

## License

[MIT](LICENSE)
