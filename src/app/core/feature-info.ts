import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type FeatureKey = 'training' | 'quests';

interface FeatureDefinition {
  name: string;
  tagline: string;
  icon: string;
  /** Opening line(s). */
  intro: string[];
  /** What's in it. */
  points: string[];
  outro: string;
}

/** One place that defines each feature; used by the ⓘ cards and Settings → About. */
export const FEATURES: Record<FeatureKey, FeatureDefinition> = {
  training: {
    name: 'Training Ground',
    tagline: 'Raise your stats',
    icon: 'fitness_center',
    intro: ['Your Training Ground tracks your physical progress, not just your workouts.'],
    points: [
      'Workouts: exercises with sets, reps, weights, machine settings and rests. Name a workout (like "Push day") and next time it shows what you did last time.',
      'Get Moving: walks, runs and bike rides, with time, distance and place.',
      'Weigh-ins: your weight, and when you weighed in.',
    ],
    outro:
      'Log as you go. Suggestions and auto-fill from your past sessions keep it quick, and every session earns XP toward your level.',
  },
  quests: {
    name: 'Quest Log',
    tagline: 'Free your mind',
    icon: 'menu_book',
    intro: [
      'Your Quest Log keeps track of goals, to-dos, lists and anything else you want to remember.',
      "It's here to help you get things done, and to unburden your mind: capture something in seconds so you can stop holding onto it, then organize it when you're ready.",
    ],
    points: [
      'New quests land in the Inbox. Sort them into Now, Soon or Someday when you have a minute.',
      'Tag quests to group them into lists, and mark them ⭐ Important or 🔥 Urgent so they rise to the top.',
      "Open a quest to add notes, checklists and links. Complete it when it's done; it's kept, just out of the way.",
    ],
    outro: 'Capturing and completing quests earns XP.',
  },
};

/** Card describing a feature. Shows a close button when `closable`. */
@Component({
  selector: 'app-feature-info',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @let f = features[feature()];
    <section class="info" [attr.aria-label]="'About ' + f.name">
      <div class="info-head">
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">{{ f.icon }}</mat-icon>
        <h2 class="info-title">{{ f.name }} <span class="tagline">— {{ f.tagline }}</span></h2>
        @if (closable()) {
          <button matIconButton type="button" class="info-close" (click)="closed.emit()" aria-label="Close">
            <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
          </button>
        }
      </div>
      @for (p of f.intro; track $index) {
        <p>{{ p }}</p>
      }
      <ul>
        @for (p of f.points; track $index) {
          <li>{{ p }}</li>
        }
      </ul>
      <p>{{ f.outro }}</p>
    </section>
  `,
  styles: `
    .info {
      margin-bottom: 16px;
      padding: 12px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background-color: var(--mat-sys-surface-container-low);
    }

    .info-head {
      display: flex;
      align-items: center;
      gap: 8px;

      mat-icon {
        color: var(--mat-sys-primary);
      }
    }

    .info-title {
      flex: 1;
      margin: 0;
      font: var(--mat-sys-title-medium);
    }

    .tagline {
      color: var(--mat-sys-on-surface-variant);
    }

    p,
    li {
      color: var(--mat-sys-on-surface-variant);
    }

    p {
      margin: 8px 0;
    }

    ul {
      margin: 8px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }
  `,
})
export class FeatureInfo {
  readonly feature = input.required<FeatureKey>();
  readonly closable = input(false);
  readonly closed = output<void>();

  protected readonly features = FEATURES;
}
