import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Search that takes no room until needed: a magnifying-glass button that opens into a
 * search field (focused). ✕ or Esc clears the search and closes it. Filters as you type.
 */
@Component({
  selector: 'app-search-box',
  imports: [MatButtonModule, MatIconModule],
  host: { '[class.open]': 'isOpen()' },
  template: `
    @if (isOpen()) {
      <div class="field">
        <mat-icon class="lens" fontSet="material-symbols-outlined" aria-hidden="true">search</mat-icon>
        <input
          #field
          type="search"
          class="search-input"
          [value]="query()"
          (input)="query.set(field.value)"
          (keydown.escape)="close()"
          [placeholder]="placeholder()"
          [attr.aria-label]="label()"
          autocomplete="off"
          enterkeyhint="search"
        />
        <button matIconButton type="button" class="close-search" (click)="close()" aria-label="Close search">
          <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
        </button>
      </div>
    } @else {
      <button matIconButton type="button" class="open-search" (click)="open()" [attr.aria-label]="label()" [title]="label()">
        <mat-icon fontSet="material-symbols-outlined">search</mat-icon>
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    :host(.open) {
      flex: 1 1 220px;
      min-width: 0;
    }
    .field {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      padding-left: 10px;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 999px;
      background: var(--mat-sys-surface-container-lowest);

      &:focus-within {
        outline: 2px solid var(--mat-sys-primary);
        outline-offset: -1px;
      }
    }
    .lens {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--mat-sys-on-surface-variant);
    }
    .search-input {
      flex: 1;
      min-width: 0;
      padding: 8px;
      border: none;
      outline: none;
      background: transparent;
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-large);

      // The field has its own ✕.
      &::-webkit-search-cancel-button {
        display: none;
      }
    }
    .close-search {
      flex-shrink: 0;
    }
  `,
})
export class SearchBox {
  /** The search text ('' = not searching). */
  readonly query = model('');
  /** Button / field label for screen readers, e.g. "Search quests". */
  readonly label = input('Search');
  readonly placeholder = input('Search');

  private readonly injector = inject(Injector);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly opened = signal(false);
  /** Open while asked to be, or while there's a search to show. */
  protected readonly isOpen = computed(() => this.opened() || !!this.query());

  protected open(): void {
    this.opened.set(true);
    afterNextRender(() => this.field()?.nativeElement.focus(), { injector: this.injector });
  }

  protected close(): void {
    this.query.set('');
    this.opened.set(false);
  }
}
