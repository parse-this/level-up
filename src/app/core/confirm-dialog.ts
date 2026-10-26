import { Component, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label for the confirm button. Default "Delete". */
  confirmLabel?: string;
}

/** Themed yes/no dialog. Cancel has initial focus, so Enter doesn't delete by accident. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" [mat-dialog-close]="false" cdkFocusInitial>Cancel</button>
      <button matButton="filled" type="button" class="confirm" [mat-dialog-close]="true">
        {{ data.confirmLabel ?? 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .confirm {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  /** Resolves true only if the user clicks the confirm button. */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialog, ConfirmOptions, boolean>(ConfirmDialog, {
      data: options,
      width: '360px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'first-tabbable',
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
