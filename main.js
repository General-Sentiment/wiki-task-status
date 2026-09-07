const {
  MarkdownRenderChild,
  MarkdownView,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  editorInfoField,
  editorLivePreviewField
} = require("obsidian");
const { StateEffect } = require("@codemirror/state");
const { Decoration, ViewPlugin, WidgetType } = require("@codemirror/view");

const DEFAULT_SETTINGS = {
  propertyName: "done"
};

function hasTaskProperty(cache, propertyName) {
  return Object.prototype.hasOwnProperty.call(cache?.frontmatter ?? {}, propertyName);
}

function isDone(cache, propertyName) {
  const value = cache?.frontmatter?.[propertyName];
  return value !== undefined && value !== null && value !== false && value !== "";
}

function localTimestamp(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

function standaloneInternalLink(paragraph) {
  if (paragraph.tagName !== "P") return null;
  const meaningfulNodes = [...paragraph.childNodes].filter((node) => {
    return node.nodeType !== Node.TEXT_NODE || node.textContent.trim() !== "";
  });
  if (meaningfulNodes.length !== 1) return null;
  const node = meaningfulNodes[0];
  return node.nodeType === Node.ELEMENT_NODE && node.matches("a.internal-link") ? node : null;
}

const refreshEditorTasks = StateEffect.define();

function editorSourcePath(view) {
  return view.state.field(editorInfoField, false)?.file?.path ?? "";
}

function editorTaskDecorations(view, plugin) {
  const decorations = [];
  if (!view.state.field(editorLivePreviewField, false)) {
    return Decoration.none;
  }

  const sourcePath = editorSourcePath(view);
  for (const range of view.visibleRanges) {
    let position = range.from;
    while (position <= range.to) {
      const line = view.state.doc.lineAt(position);
      const match = line.text.match(/^(\s*)\[\[([^\]]+)\]\]\s*$/);
      if (match) {
        const destination = match[2].split("|")[0].split("#")[0].trim();
        const file = plugin.app.metadataCache.getFirstLinkpathDest(destination, sourcePath);
        if (
          file instanceof TFile &&
          hasTaskProperty(
            plugin.app.metadataCache.getFileCache(file),
            plugin.settings.propertyName
          )
        ) {
          const done = isDone(
            plugin.app.metadataCache.getFileCache(file),
            plugin.settings.propertyName
          );
          decorations.push(
            Decoration.widget({
              widget: new WikiTaskEditorWidget(plugin, file, done),
              side: -1
            }).range(line.from + match[1].length)
          );
        }
      }
      if (line.to >= range.to || line.to >= view.state.doc.length) break;
      position = line.to + 1;
    }
  }

  return Decoration.set(decorations, true);
}

class WikiTaskEditorWidget extends WidgetType {
  constructor(plugin, file, done) {
    super();
    this.plugin = plugin;
    this.file = file;
    this.done = done;
  }

  eq(other) {
    return other.file.path === this.file.path && other.done === this.done;
  }

  toDOM() {
    const wrapper = document.createElement("span");
    wrapper.className = "wiki-task-status-editor-widget";
    const checkbox = wrapper.createEl("input", {
      type: "checkbox",
      attr: {
        "aria-label": `Toggle task ${this.file.basename}`,
        "data-task": this.done ? "x" : ""
      }
    });
    checkbox.addClass("task-list-item-checkbox");
    checkbox.checked = this.done;
    checkbox.addEventListener("mousedown", (event) => event.stopPropagation());
    checkbox.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextDone = !this.done;
      checkbox.disabled = true;
      try {
        await this.plugin.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
          frontmatter[this.plugin.settings.propertyName] = nextDone ? localTimestamp() : null;
        });
      } catch (error) {
        console.error("Wiki Task Status: unable to update task", error);
        checkbox.checked = this.done;
      } finally {
        checkbox.disabled = false;
      }
    });
    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

class WikiTaskRenderChild extends MarkdownRenderChild {
  constructor(containerEl, plugin, sourcePath, file, paragraph, link) {
    super(containerEl);
    this.plugin = plugin;
    this.sourcePath = sourcePath;
    this.file = file;
    this.paragraph = paragraph;
    this.link = link;
  }

  onload() {
    this.paragraph.addClass("wiki-task-status");
    this.paragraph.empty();

    this.checkbox = this.paragraph.createEl("input", {
      type: "checkbox",
      attr: {
        "aria-label": `Toggle task ${this.file.basename}`,
        "data-task": isDone(
          this.plugin.app.metadataCache.getFileCache(this.file),
          this.plugin.settings.propertyName
        ) ? "x" : ""
      }
    });
    this.checkbox.addClass("task-list-item-checkbox");
    this.checkbox.addEventListener("change", this.onChange);

    this.link.addClass("wiki-task-status-link");
    this.paragraph.appendChild(this.link);
    this.refresh();

    this.registerEvent(
      this.plugin.app.metadataCache.on("changed", (changedFile) => {
        if (changedFile.path === this.file.path) this.refresh();
      })
    );
  }

  onunload() {
    this.checkbox?.removeEventListener("change", this.onChange);
  }

  onChange = async () => {
    const nextDone = this.checkbox.checked;
    this.checkbox.disabled = true;
    try {
      await this.plugin.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
        frontmatter[this.plugin.settings.propertyName] = nextDone ? localTimestamp() : null;
      });
    } catch (error) {
      console.error("Wiki Task Status: unable to update task", error);
      this.checkbox.checked = !nextDone;
    } finally {
      this.checkbox.disabled = false;
      this.refresh();
    }
  };

  refresh() {
    const done = isDone(
      this.plugin.app.metadataCache.getFileCache(this.file),
      this.plugin.settings.propertyName
    );
    this.checkbox.checked = done;
    this.checkbox.dataset.task = done ? "x" : "";
    this.paragraph.toggleClass("is-checked", done);
  }
}

module.exports = class WikiTaskStatusPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new WikiTaskStatusSettingTab(this.app, this));
    const thisPlugin = this;

    this.registerEditorExtension(
      ViewPlugin.fromClass(
        class {
          constructor(view) {
            this.decorations = editorTaskDecorations(view, thisPlugin);
          }

          update(update) {
            if (
              update.docChanged ||
              update.viewportChanged ||
              update.startState.field(editorLivePreviewField, false) !==
                update.state.field(editorLivePreviewField, false) ||
              update.transactions.some((transaction) =>
                transaction.effects.some((effect) => effect.is(refreshEditorTasks))
              )
            ) {
              this.decorations = editorTaskDecorations(update.view, thisPlugin);
            }
          }
        },
        { decorations: (value) => value.decorations }
      )
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        this.app.workspace.iterateAllLeaves((leaf) => {
          if (leaf.view instanceof MarkdownView) {
            leaf.view.editor?.cm?.dispatch({ effects: refreshEditorTasks.of(null) });
          }
        });
      })
    );

    this.registerMarkdownPostProcessor((element, context) => {
      for (const paragraph of element.querySelectorAll("p")) {
        const link = standaloneInternalLink(paragraph);
        if (!link) continue;

        const destination = link.getAttribute("data-href") || link.getAttribute("href");
        if (!destination) continue;

        const file = this.app.metadataCache.getFirstLinkpathDest(destination, context.sourcePath);
        if (!(file instanceof TFile)) continue;
        if (
          !hasTaskProperty(
            this.app.metadataCache.getFileCache(file),
            this.settings.propertyName
          )
        ) continue;

        context.addChild(
          new WikiTaskRenderChild(element, this, context.sourcePath, file, paragraph, link)
        );
      }
    });
  }
};

class WikiTaskStatusSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("Task property")
      .setDesc("A linked note with this property renders as a task. A value means complete; an empty value means open.")
      .addText((text) =>
        text
          .setPlaceholder("done")
          .setValue(this.plugin.settings.propertyName)
          .onChange(async (value) => {
            this.plugin.settings.propertyName = value.trim() || DEFAULT_SETTINGS.propertyName;
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}
