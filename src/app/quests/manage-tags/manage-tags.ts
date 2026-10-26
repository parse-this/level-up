import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ConfirmService } from '../../core/confirm-dialog';
import { Tag } from '../quest';
import { QuestStore } from '../quest.store';

/** Dialog: rename tags in place (saved on blur/Enter) or delete them. */
@Component({
  selector: 'app-manage-tags',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Manage tags</h2>
    <mat-dialog-content>
      @for (t of store.tags(); track t.id) {
        <div class="tag-row">
          <mat-form-field class="tag-name" subscriptSizing="dynamic">
            <input
              matInput
              [value]="t.name"
              [attr.aria-label]="'Rename ' + t.name"
              (blur)="rename(t, $any($event.target))"
              (keydown.enter)="$any($event.target).blur()"
            />
          </mat-form-field>
          <span class="count">{{ uses(t.id) }}</span>
          <button matIconButton type="button" (click)="remove(t)" [attr.aria-label]="'Delete ' + t.name">
            <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
          </button>
        </div>
      } @empty {
        <p class="none">No tags yet. Add them from the Tags button.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
  styles: `
    .tag-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tag-name {
      flex: 1;
    }
    .count {
      min-width: 24px;
      text-align: right;
      color: var(--mat-sys-on-surface-variant);
    }
    .none {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ManageTags {
  protected readonly store = inject(QuestStore);
  private readonly confirmService = inject(ConfirmService);

  /** Quests (open or closed) using this tag. */
  protected uses(id: string): number {
    return this.store.quests().filter((l) => l.tagIds.includes(id)).length;
  }

  protected rename(tag: Tag, input: HTMLInputElement): void {
    const name = input.value.trim();
    if (!name) {
      input.value = tag.name; // blank isn't allowed; put it back
      return;
    }
    if (name !== tag.name) this.store.renameTag(tag.id, name);
  }

  protected async remove(tag: Tag): Promise<void> {
    const n = this.uses(tag.id);
    const confirmed = await this.confirmService.confirm({
      title: `Delete tag "${tag.name}"?`,
      message: n
        ? `It will be removed from ${n} ${n === 1 ? 'quest' : 'quests'}. The quests stay.`
        : "It isn't used by any quests.",
    });
    if (confirmed) this.store.deleteTag(tag.id);
  }
}
