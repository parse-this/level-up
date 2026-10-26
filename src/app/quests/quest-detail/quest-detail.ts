import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BackRail } from '../../core/back-rail';
import { ConfirmService } from '../../core/confirm-dialog';
import {
  HORIZONS,
  HORIZON_LABELS,
  Horizon,
  IMPORTANCES,
  IMPORTANCE_ICONS,
  IMPORTANCE_LABELS,
  Importance,
  Quest,
} from '../quest';
import { QuestStore } from '../quest.store';
import { NotesEditor } from '../notes-editor/notes-editor';
import { TagPicker } from '../tag-picker/tag-picker';

/** One quest's page: title, horizon, importance, tags, notes; close/reopen; delete. Saved as you go. */
@Component({
  selector: 'app-quest-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    BackRail,
    NotesEditor,
    TagPicker,
  ],
  templateUrl: './quest-detail.html',
  styleUrl: './quest-detail.scss',
})
export class QuestDetail {
  /** From the `:questId` route param. */
  readonly questId = input.required<string>();

  protected readonly store = inject(QuestStore);
  private readonly router = inject(Router);
  private readonly confirmService = inject(ConfirmService);

  protected readonly quest = computed(() => this.store.byId(this.questId()));
  /** The editor is created once per quest, so key it by id. */
  protected readonly notesKey = computed(() => (this.quest() ? [this.questId()] : []));

  protected readonly horizons = HORIZONS;
  protected readonly horizonLabels = HORIZON_LABELS;
  protected readonly importances = IMPORTANCES;
  protected readonly importanceLabels = IMPORTANCE_LABELS;
  protected readonly importanceIcons = IMPORTANCE_ICONS;

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    horizon: new FormControl<Horizon>('inbox', { nonNullable: true }),
    importance: new FormControl<Importance>('normal', { nonNullable: true }),
  });

  constructor() {
    // Load once per quest, so saving doesn't overwrite what's being typed.
    effect(() => {
      this.questId();
      const l = untracked(this.quest);
      if (l) {
        this.form.setValue(
          { title: l.title, horizon: l.horizon, importance: l.importance },
          { emitEvent: false },
        );
      }
    });

    // Each field saves on its own, so a momentarily blank title doesn't block other changes.
    const { title, horizon, importance } = this.form.controls;
    title.valueChanges.pipe(takeUntilDestroyed()).subscribe((t) => {
      if (title.valid) this.save({ title: t.trim() });
    });
    horizon.valueChanges.pipe(takeUntilDestroyed()).subscribe((h) => this.save({ horizon: h }));
    importance.valueChanges.pipe(takeUntilDestroyed()).subscribe((i) => this.save({ importance: i }));
  }

  protected tagName(id: string): string {
    return this.store.tagById(id)?.name ?? '';
  }

  protected setTags(tagIds: string[]): void {
    this.save({ tagIds });
  }

  protected removeTag(id: string): void {
    const l = this.quest();
    if (l) this.save({ tagIds: l.tagIds.filter((t) => t !== id) });
  }

  protected saveNotes(html: string): void {
    const l = this.quest();
    if (!l) return;
    const { notes: _old, ...rest } = l;
    this.store.update(html ? { ...rest, notes: html } : rest);
  }

  protected toggleClosed(): void {
    const l = this.quest();
    if (!l) return;
    if (l.closedAt) this.store.reopen(l.id);
    else this.store.close(l.id);
  }

  protected async remove(): Promise<void> {
    const l = this.quest();
    if (!l) return;
    const confirmed = await this.confirmService.confirm({
      title: 'Delete quest?',
      message: `"${l.title}" will be gone for good. This can't be undone.`,
    });
    if (!confirmed) return;
    this.store.remove(l.id);
    this.router.navigate(['/quests']);
  }

  private save(change: Partial<Quest>): void {
    const l = this.quest();
    if (l) this.store.update({ ...l, ...change });
  }
}
