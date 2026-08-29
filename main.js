const { MarkdownRenderChild, Plugin, PluginSettingTab, Setting, TFile } = require("obsidian");

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
