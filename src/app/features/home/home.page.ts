import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgramStore } from '../../core/services/program-store';
import { AuthStore } from '../../core/services/auth-store';
import { SyncService } from '../../core/services/sync.service';
import { HistoryService } from '../../core/services/history.service';

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
    const nextIndex = this.store.today().dayNumber % days.length;
    return days[nextIndex];
  });
}
