import { Component, computed, input } from '@angular/core';
import { Exercise, countSets, stepLabels, totalRest } from '../entry';

/**
 * Read-only exercise summary: name, "[Setting S · ]N sets [· M min rest]", each step, notes.
 * Buttons go in an element marked `actions` (projected on the right).
 */
@Component({
  selector: 'app-exercise-card',
  template: `
    <div class="exercise-main">
      <div class="exercise-name">{{ exercise().name }}</div>
      <div class="exercise-meta">
        @if (exercise().machineSetting != null) {
          Setting {{ exercise().machineSetting }} ·
        }
        {{ sets() }} {{ sets() === 1 ? 'set' : 'sets' }}
        @if (rest()) {
          · {{ rest() }} min rest
        }
      </div>
      <ul class="exercise-steps">
        @for (step of exercise().steps; track $index) {
          @if (step.type === 'set') {
            <li>
              <span class="step-name">{{ labels()[$index] }}:</span>
              {{ step.reps }} reps
              @if (step.weight != null) {
                @ {{ step.weight }} lb
              }
              @if (step.failure) {
                <span class="tag failure">Failure</span>
              }
              @if (step.easy) {
                <span class="tag easy">Easy</span>
              }
            </li>
          } @else {
            <li class="rest-line">Rest {{ step.minutes }} min</li>
          }
        }
      </ul>
      @if (exercise().notes) {
        <div class="exercise-notes">{{ exercise().notes }}</div>
      }
    </div>
    <div class="exercise-actions">
      <ng-content select="[actions]" />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 8px 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
    }

    .exercise-main {
      flex: 1;
      min-width: 0;
    }

    .exercise-name {
      font: var(--mat-sys-title-medium);
    }

    .exercise-meta {
      color: var(--mat-sys-on-surface-variant);
    }

    .exercise-steps {
      margin: 4px 0 0;
      padding-left: 0;
      list-style: none;
    }

    .step-name {
      color: var(--mat-sys-on-surface-variant);
    }

    .rest-line {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }

    .tag {
      font: var(--mat-sys-label-small);
      padding: 1px 8px;
      border-radius: 999px;
      margin-left: 4px;

      &.failure {
        background-color: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }

      &.easy {
        background-color: var(--mat-sys-tertiary-container);
        color: var(--mat-sys-on-tertiary-container);
      }
    }

    .exercise-notes {
      margin-top: 4px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .exercise-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
  `,
})
export class ExerciseCard {
  readonly exercise = input.required<Exercise>();

  protected readonly sets = computed(() => countSets(this.exercise().steps));
  protected readonly rest = computed(() => totalRest(this.exercise().steps));
  protected readonly labels = computed(() => stepLabels(this.exercise().steps));
}
