import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProgramStore } from '../../core/services/program-store';
import { AuthStore } from '../../core/services/auth-store';
import { SyncService } from '../../core/services/sync.service';
import { HistoryService } from '../../core/services/history.service';
import { WorkoutSessionService } from '../../core/services/workout-session.service';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly store = inject(ProgramStore);
  protected readonly auth = inject(AuthStore);
  protected readonly sync = inject(SyncService);
  protected readonly history = inject(HistoryService);
  protected readonly workout = inject(WorkoutSessionService);
  private readonly router = inject(Router);
  protected readonly dateLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  protected readonly totalSets = computed(() =>
    this.store.today().exercises.reduce((total, exercise) => total + exercise.sets, 0),
  );

  protected readonly nextDay = computed(() => {
    const days = this.store.program().days;
    return days[(this.store.currentDayIndex() + 1) % days.length] ?? this.store.today();
  });

  protected readonly completedDayIds = computed(() => {
    const cycleStart = new Date(`${this.store.currentCycleStartedAt()}T00:00:00`).getTime();
    return new Set(
      this.history
        .completedSessions()
        .filter((session) => new Date(session.finishedAt ?? session.startedAt).getTime() >= cycleStart)
        .map((session) => session.programDayId),
    );
  });
  protected readonly cycleTrainingDays = computed(() =>
    this.store.program().days.filter((day) => day.kind === 'training'),
  );
  protected readonly completedCycleSessions = computed(
    () => this.cycleTrainingDays().filter((day) => this.completedDayIds().has(day.id)).length,
  );
  protected readonly cycleProgress = computed(() => {
    const total = this.cycleTrainingDays().length;
    return total === 0 ? 0 : Math.round((this.completedCycleSessions() / total) * 100);
  });

  protected async openSession(): Promise<void> {
    const activeSession = this.workout.activeSession();
    await this.router.navigate(['/seance'], {
      queryParams: activeSession ? undefined : { day: this.store.today().id },
    });
  }

  protected async chooseSession(): Promise<void> {
    await this.router.navigate(['/seance']);
  }
}
