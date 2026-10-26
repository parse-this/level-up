import { Component, computed, inject, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { QuestStore } from '../quest.store';

/** "Tags" button opening a menu: check existing tags, or create a new one (which gets checked). */
@Component({
  selector: 'app-tag-picker',
  imports: [MatButtonModule, MatCheckboxModule, MatIconModule, MatMenuModule],
  template: `
    <button
      matButton="outlined"
      type="button"
      class="tag-picker-trigger"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="ariaLabel()"
    >
      <mat-icon fontSet="material-symbols-outlined">sell</mat-icon>
      {{ selected().length ? 'Tags (' + selected().length + ')' : 'Tags' }}
    </button>

    <mat-menu #menu="matMenu" class="tag-menu">
      <!-- Keep clicks and typing inside the menu from closing it or moving focus. -->
      <div class="tag-menu-body" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
        @for (t of store.tags(); track t.id) {
          <mat-checkbox class="tag-option" [checked]="selected().includes(t.id)" (change)="toggle(t.id)">
            {{ t.name }}
          </mat-checkbox>
        } @empty {
          <p class="none">No tags yet.</p>
        }
        <form class="new-tag" (submit)="$event.preventDefault(); create(newTag)">
          <input #newTag class="new-tag-input" placeholder="New tag" aria-label="New tag name" />
          <button matIconButton type="submit" aria-label="Add tag">
            <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
          </button>
        </form>
      </div>
    </mat-menu>
  `,
  styles: `
    .tag-menu-body {
      display: flex;
      flex-direction: column;
      min-width: 220px;
      padding: 4px 8px;
    }

    .none {
      margin: 8px;
      color: var(--mat-sys-on-surface-variant);
    }

    .new-tag {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    .new-tag-input {
      flex: 1;
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);

      &:focus {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -1px;
      }
    }
  `,
})
export class TagPicker {
  /** Selected tag ids (two-way: `[(selected)]`). */
  readonly selected = model<string[]>([]);

  protected readonly store = inject(QuestStore);

  protected readonly ariaLabel = computed(() => {
    const n = this.selected().length;
    return n ? `Tags, ${n} selected` : 'Tags';
  });

  protected toggle(id: string): void {
    const ids = this.selected();
    this.selected.set(ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id]);
  }

  protected create(input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) return;
    const tag = this.store.createTag(name);
    if (!this.selected().includes(tag.id)) this.selected.set([...this.selected(), tag.id]);
    input.value = '';
  }
}
