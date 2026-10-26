import { Injector, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/** A routed page that can tell whether leaving would lose unsaved work. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page with unsaved exercise forms. (Closing the browser isn't covered.) */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = async (page) => {
  if (!page.hasUnsavedChanges()) return true;
  const injector = inject(Injector);
  // Loaded on demand so the dialog code stays out of the initial download.
  const { ConfirmService } = await import('./confirm-dialog');
  return injector.get(ConfirmService).confirm({
    title: 'Discard unsaved exercises?',
    message: "Exercises you haven't saved will be lost.",
    confirmLabel: 'Discard',
  });
};
