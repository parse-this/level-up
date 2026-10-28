import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmService } from '../core/confirm-dialog';
import { PAGE_RELOAD } from '../core/page-reload';
import {
  SaveFile,
  describeSave,
  makeSaveFile,
  mergeData,
  parseSaveFile,
  saveFileName,
} from '../core/save-game';
import { StorageService } from '../core/storage.service';

export { PAGE_RELOAD };

/** Save game (download everything as a file) / Load game (merge or replace from a file). */
@Component({
  selector: 'app-save-load',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title">Save &amp; load game</h2>
    <p class="intro">
      Your progress lives in this browser. Save a file to keep a backup, or to move your progress to another
      device or browser.
    </p>

    <mat-card appearance="outlined" class="card">
      <mat-card-header>
        <mat-icon mat-card-avatar fontSet="material-symbols-outlined" class="avatar">save</mat-icon>
        <mat-card-title>Save game</mat-card-title>
        <mat-card-subtitle>Download everything (training, quests, tags) as a save file.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-actions align="end">
        <button matButton="filled" type="button" class="save" (click)="save()">
          <mat-icon fontSet="material-symbols-outlined">download</mat-icon>
          Save game
        </button>
      </mat-card-actions>
    </mat-card>

    <mat-card appearance="outlined" class="card">
      <mat-card-header>
        <mat-icon mat-card-avatar fontSet="material-symbols-outlined" class="avatar">sports_esports</mat-icon>
        <mat-card-title>Load game</mat-card-title>
        <mat-card-subtitle>Restore from a save file.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <input
          #fileInput
          type="file"
          accept=".json,application/json"
          class="file-input"
          aria-label="Choose a save file"
          (change)="pick(fileInput)"
        />

        @if (error(); as e) {
          <p class="error" role="alert">{{ e }}</p>
        }

        @if (loaded(); as save) {
          <div class="summary" role="status">
            <div class="summary-title">Save from {{ save.savedAt | date: 'MMM d, y, h:mm a' }}</div>
            <div class="summary-detail">{{ describe(save).join(' · ') || 'No data' }}</div>
          </div>
          <p class="hint">
            <strong>Merge</strong> adds anything from the save that isn't on this device and keeps everything
            already here. <strong>Replace</strong> makes this device exactly match the save.
          </p>
        }
      </mat-card-content>
      <mat-card-actions align="end">
        @if (loaded()) {
          <button matButton type="button" class="cancel" (click)="clear(fileInput)">Cancel</button>
          <button matButton="outlined" type="button" class="replace" (click)="replace()">Replace</button>
          <button matButton="filled" type="button" class="merge" (click)="merge()">Merge</button>
        } @else {
          <button matButton="filled" type="button" class="load" (click)="fileInput.click()">
            <mat-icon fontSet="material-symbols-outlined">upload</mat-icon>
            Load game
          </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .back {
      margin: -8px 0 8px -12px;
    }
    .title {
      font: var(--mat-sys-headline-small);
      margin: 0 0 8px;
    }
    .intro {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 16px;
    }
    .card {
      margin-bottom: 16px;
    }
    .avatar {
      color: var(--mat-sys-primary);
      font-size: 32px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .file-input {
      display: none;
    }
    .summary {
      margin-top: 12px;
      padding: 12px;
      border-radius: 8px;
      background-color: var(--mat-sys-surface-container-high);
    }
    .summary-title {
      font: var(--mat-sys-title-small);
    }
    .summary-detail,
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
    .hint {
      margin: 12px 0 0;
    }
    .error {
      margin: 12px 0 0;
      color: var(--mat-sys-error);
    }
  `,
})
export class SaveLoad {
  private readonly storage = inject(StorageService);
  private readonly confirmService = inject(ConfirmService);
  private readonly reload = inject(PAGE_RELOAD);

  protected readonly loaded = signal<SaveFile | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly describe = describeSave;

  /** Downloads every app key as a save file. */
  protected save(): void {
    const save = makeSaveFile(this.currentData());
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  protected async pick(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    this.error.set(null);
    this.loaded.set(null);
    if (!file) return;
    try {
      this.loaded.set(parseSaveFile(await file.text()));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : "Couldn't read that file.");
      input.value = '';
    }
  }

  protected clear(input: HTMLInputElement): void {
    this.loaded.set(null);
    this.error.set(null);
    input.value = '';
  }

  protected merge(): void {
    const save = this.loaded();
    if (!save) return;
    this.write(mergeData(this.currentData(), save.data));
  }

  protected async replace(): Promise<void> {
    const save = this.loaded();
    if (!save) return;
    const ok = await this.confirmService.confirm({
      title: 'Replace your progress?',
      message: "Everything on this device will be replaced by the save file. This can't be undone.",
      confirmLabel: 'Replace',
    });
    if (!ok) return;
    for (const key of this.storage.keys()) this.storage.remove(key);
    this.write(save.data);
  }

  private currentData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key of this.storage.keys()) {
      const raw = this.storage.raw(key);
      try {
        data[key] = raw === null ? null : JSON.parse(raw);
      } catch {
        // Skip anything unreadable rather than breaking the save.
      }
    }
    return data;
  }

  /** Writes the data and reloads so every feature (and XP) re-reads it. */
  private write(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) this.storage.saveRaw(key, JSON.stringify(value));
    this.reload();
  }
}
