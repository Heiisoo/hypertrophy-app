import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { hypertrophyDb } from '../../core/database/hypertrophy.database';
import { WorkoutSession, WorkoutSet } from '../../core/models/training.models';
import { ProgramStore } from '../../core/services/program-store';
import { WorkoutSessionService } from '../../core/services/workout-session.service';

@Component({
  selector: 'app-stats-page',
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsPage {
  protected readonly store = inject(ProgramStore);
  protected readonly workout = inject(WorkoutSessionService);
  protected readonly sessions = signal<readonly WorkoutSession[]>([]);
  protected readonly sets = signal<readonly WorkoutSet[]>([]);

  protected readonly totalDurationSeconds = computed(() =>
    this.sessions().reduce((total, session) => total + (session.durationSeconds ?? 0), 0),
  );
  protected readonly averageDurationSeconds = computed(() =>
    this.sessions().length === 0
      ? 0
      : Math.round(this.totalDurationSeconds() / this.sessions().length),
  );
  protected readonly totalVolume = computed(() =>
    Math.round(this.sets().reduce((total, set) => total + set.weightKg * set.reps, 0)),
  );
  protected readonly weeklySessions = computed(() => {
    const start = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.sessions().filter((session) => new Date(session.startedAt).getTime() >= start)
      .length;
  });

  constructor() {
    void this.refresh();
  }

  protected dayTitle(programDayId: string): string {
    return (
      this.store.program().days.find((day) => day.id === programDayId)?.title ?? 'Séance libre'
    );
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;
  }

  private async refresh(): Promise<void> {
    const [sessions, sets] = await Promise.all([
      hypertrophyDb.workoutSessions.where('status').equals('completed').toArray(),
      hypertrophyDb.workoutSets.filter((set) => Boolean(set.completedAt)).toArray(),
    ]);
    sessions.sort((a, b) =>
      (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt),
    );
    this.sessions.set(sessions);
    this.sets.set(sets);
  }
}
