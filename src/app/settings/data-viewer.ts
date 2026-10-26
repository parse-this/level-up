import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { APP_KEY_PREFIX, StorageService } from '../core/storage.service';

interface DataSet {
  /** Full storage key. */
  key: string;
  /** Key without the app prefix, e.g. "training.entries". */
  name: string;
  /** Pretty-printed JSON, or the raw text if it isn't valid JSON. */
  json: string;
  /** "12 items · 3.4 KB" */
  summary: string;
}

function formatBytes(chars: number): string {
  return chars < 1024 ? `${chars} B` : `${(chars / 1024).toFixed(1)} KB`;
}

function toDataSet(key: string, raw: string): DataSet {
  let json = raw;
  let count = '';
  try {
    const value: unknown = JSON.parse(raw);
    json = JSON.stringify(value, null, 2);
    if (Array.isArray(value)) count = `${value.length} ${value.length === 1 ? 'item' : 'items'} · `;
  } catch {
    count = 'Not valid JSON · ';
  }
  return {
    key,
    name: key.slice(APP_KEY_PREFIX.length),
    json,
    summary: count + formatBytes(raw.length),
  };
}

/** Read-only view of everything the app has saved. */
@Component({
  selector: 'app-data-viewer',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <a matButton routerLink="/settings" class="back">
      <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      Settings
    </a>

    <h2 class="title">View data</h2>
    <p class="intro">
      Everything Level Up Tracker has saved in this browser's local storage. Read-only. Other
      browsers and devices have their own separate data.
    </p>

    @for (d of dataSets; track d.key) {
      <mat-card appearance="outlined" class="data-set">
        <mat-card-header>
          <mat-card-title>{{ d.name }}</mat-card-title>
          <mat-card-subtitle>{{ d.summary }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <pre class="json" tabindex="0" [attr.aria-label]="d.name + ' data'">{{ d.json }}</pre>
        </mat-card-content>
        <mat-card-actions align="end">
          <button matButton type="button" (click)="copy(d)">
            <mat-icon fontSet="material-symbols-outlined">{{
              copiedKey() === d.key ? 'check' : 'content_copy'
            }}</mat-icon>
            {{ copiedKey() === d.key ? 'Copied' : 'Copy' }}
          </button>
        </mat-card-actions>
      </mat-card>
    } @empty {
      <p class="empty">No save data yet.</p>
    }
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
    .data-set {
      margin-bottom: 16px;
    }
    mat-card-subtitle {
      margin-top: 4px;
    }
    .json {
      margin: 12px 0 0;
      padding: 12px;
      max-height: 480px;
      overflow: auto;
      border-radius: 8px;
      background-color: var(--mat-sys-surface-container-lowest);
      font-family: ui-monospace, Consolas, 'Cascadia Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre;

      &:focus-visible {
        outline: 2px solid var(--mat-sys-primary);
      }
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
    }
  `,
})
export class DataViewer {
  private readonly storage = inject(StorageService);

  /** Snapshot when the page opens. */
  protected readonly dataSets: DataSet[] = this.storage
    .keys()
    .map((key) => toDataSet(key, this.storage.raw(key) ?? ''));

  /** Which data set was just copied (shows "Copied" briefly). */
  protected readonly copiedKey = signal<string | null>(null);

  protected async copy(d: DataSet): Promise<void> {
    try {
      await navigator.clipboard.writeText(d.json);
      this.copiedKey.set(d.key);
      setTimeout(() => {
        if (this.copiedKey() === d.key) this.copiedKey.set(null);
      }, 2000);
    } catch (error) {
      console.error('Could not copy to clipboard.', error);
    }
  }
}
