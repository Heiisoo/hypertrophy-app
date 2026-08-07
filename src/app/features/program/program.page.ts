import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProgramStore } from '../../core/services/program-store';

@Component({
  selector: 'app-program-page',
  templateUrl: './program.page.html',
  styleUrl: './program.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramPage {
  protected readonly store = inject(ProgramStore);
  protected readonly expandedDayId = signal(this.store.today().id);

  protected toggleDay(dayId: string): void {
    this.expandedDayId.update((current) => (current === dayId ? '' : dayId));
  }

  protected formatRest(seconds: number): string {
    return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;
  }
}
