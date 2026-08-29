# Wiki Task Status

When a wikilink is the only content on its line, this plugin checks whether its target is a task note. If it is, the link renders with an Obsidian-style checkbox that reflects the target note's `done` property.

```md
[[Contact Adam Schultz]]
```

A note is considered a task when either:

- it lives in the `todo/` folder, or
- its `categories` frontmatter contains `[[Todo]]`.

Clicking the rendered checkbox writes a local timestamp to the target note's `done` property. Unchecking it clears `done`. Links mixed with any other content are not changed.

The transformation applies in Reading view. Source and Live Preview continue to show the original wikilink, keeping the Markdown portable and easy to edit.
