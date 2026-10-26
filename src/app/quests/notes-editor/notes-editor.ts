import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Editor } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import StarterKit from '@tiptap/starter-kit';
import { isBlankHtml } from '../quest';

type Format = 'bold' | 'italic' | 'bulletList' | 'orderedList' | 'taskList' | 'link';

/**
 * Rich notes (Tiptap): bold, italic, bullet / numbered / checkbox lists, links.
 * Toolbar for touch; markdown-style shortcuts for keyboards (`**bold**`, `- `, `1. `, `[ ] `).
 * `html` sets the starting content once; edits come out of `changed` (debounced, '' when blank).
 */
@Component({
  selector: 'app-notes-editor',
  imports: [MatButtonModule, MatIconModule],
  // Tiptap builds the editable DOM itself, so styles must not be view-encapsulated.
  // Everything is scoped under `.notes-editor`.
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="notes-editor">
      <div class="toolbar" role="toolbar" aria-label="Formatting">
        @for (b of buttons; track b.format) {
          <button
            matIconButton
            type="button"
            [class.active]="active()[b.format]"
            [attr.aria-pressed]="active()[b.format]"
            [attr.aria-label]="b.label"
            (mousedown)="$event.preventDefault()"
            (click)="apply(b.format)"
          >
            <mat-icon fontSet="material-symbols-outlined">{{ b.icon }}</mat-icon>
          </button>
        }
      </div>

      @if (linkOpen()) {
        <form class="link-row" (submit)="$event.preventDefault(); setLink(url.value)">
          <input #url class="link-input" type="url" placeholder="https://…" aria-label="Link address" [value]="linkValue()" />
          <button matButton type="submit">Apply</button>
          @if (active().link) {
            <button matButton type="button" (click)="setLink('')">Remove</button>
          }
          <button matButton type="button" (click)="linkOpen.set(false)">Cancel</button>
        </form>
      }

      <div #content class="content"></div>
    </div>
  `,
  styles: `
    .notes-editor {
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-lowest);

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        padding: 4px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);

        button.active {
          background-color: var(--mat-sys-secondary-container);
          color: var(--mat-sys-on-secondary-container);
        }
      }

      .link-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border-bottom: 1px solid var(--mat-sys-outline-variant);
      }

      .link-input {
        flex: 1 1 200px;
        padding: 8px;
        border: 1px solid var(--mat-sys-outline);
        border-radius: 8px;
        background: transparent;
        color: var(--mat-sys-on-surface);
        font: var(--mat-sys-body-medium);
      }

      .ProseMirror {
        min-height: 160px;
        padding: 12px 16px;
        outline: none;
        font: var(--mat-sys-body-large);
        overflow-wrap: anywhere;

        &:focus-visible {
          box-shadow: inset 0 0 0 2px var(--mat-sys-primary);
          border-radius: 0 0 12px 12px;
        }

        p {
          margin: 0 0 8px;
        }

        ul,
        ol {
          margin: 0 0 8px;
          padding-left: 24px;
        }

        a {
          color: var(--mat-sys-primary);
        }

        // Checkbox lists
        ul[data-type='taskList'] {
          padding-left: 4px;
          list-style: none;

          li {
            display: flex;
            align-items: flex-start;
            gap: 8px;

            > label {
              flex-shrink: 0;
              margin-top: 3px;
            }

            > div {
              flex: 1;
            }

            &[data-checked='true'] > div {
              color: var(--mat-sys-on-surface-variant);
              text-decoration: line-through;
            }
          }

          input[type='checkbox'] {
            width: 18px;
            height: 18px;
            accent-color: var(--mat-sys-primary);
          }
        }
      }
    }
  `,
})
export class NotesEditor {
  /** Starting content (HTML). Read once when the editor is created. */
  readonly html = input<string | undefined>('');
  /** Edited content as HTML; '' when blank. Debounced. */
  readonly changed = output<string>();

  protected readonly buttons: { format: Format; icon: string; label: string }[] = [
    { format: 'bold', icon: 'format_bold', label: 'Bold' },
    { format: 'italic', icon: 'format_italic', label: 'Italic' },
    { format: 'bulletList', icon: 'format_list_bulleted', label: 'Bulleted list' },
    { format: 'orderedList', icon: 'format_list_numbered', label: 'Numbered list' },
    { format: 'taskList', icon: 'checklist', label: 'Checklist' },
    { format: 'link', icon: 'link', label: 'Link' },
  ];

  protected readonly active = signal<Record<Format, boolean>>({
    bold: false,
    italic: false,
    bulletList: false,
    orderedList: false,
    taskList: false,
    link: false,
  });
  protected readonly linkOpen = signal(false);
  protected readonly linkValue = signal('');

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  /** Exposed for tests. */
  editor?: Editor;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      this.editor = new Editor({
        element: this.content().nativeElement,
        content: this.html() ?? '',
        extensions: [
          StarterKit.configure({
            heading: false,
            codeBlock: false,
            code: false,
            blockquote: false,
            horizontalRule: false,
            link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
          }),
          TaskList,
          TaskItem.configure({ nested: true }),
        ],
        editorProps: { attributes: { 'aria-label': 'Notes', 'aria-multiline': 'true' } },
        onUpdate: () => this.queueChange(),
        onTransaction: () => this.refreshActive(),
      });
      this.refreshActive();
    });

    inject(DestroyRef).onDestroy(() => {
      // Don't lose the last keystrokes if the page closes mid-debounce.
      if (this.timer) {
        clearTimeout(this.timer);
        this.emit();
      }
      this.editor?.destroy();
    });
  }

  protected apply(format: Format): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    switch (format) {
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList().run();
        break;
      case 'link':
        this.linkValue.set(this.editor!.getAttributes('link')['href'] ?? '');
        this.linkOpen.set(!this.linkOpen());
        break;
    }
  }

  /** Sets (or with '' removes) the link on the selection. */
  protected setLink(url: string): void {
    const chain = this.editor?.chain().focus().extendMarkRange('link');
    if (!chain) return;
    const href = url.trim();
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    this.linkOpen.set(false);
  }

  private refreshActive(): void {
    const e = this.editor;
    if (!e) return;
    this.active.set({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      taskList: e.isActive('taskList'),
      link: e.isActive('link'),
    });
  }

  private queueChange(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emit(), 300);
  }

  private emit(): void {
    this.timer = undefined;
    if (!this.editor) return;
    const html = this.editor.getHTML();
    this.changed.emit(isBlankHtml(html) ? '' : html);
  }
}
