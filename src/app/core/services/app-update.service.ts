import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  readonly available = signal(false);
  readonly applying = signal(false);

  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly checkWhenVisible = () => {
    if (document.visibilityState === 'visible') void this.check();
  };

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.available.set(true));

    document.addEventListener('visibilitychange', this.checkWhenVisible);
    window.addEventListener('pageshow', this.checkWhenVisible);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.checkWhenVisible);
      window.removeEventListener('pageshow', this.checkWhenVisible);
    });
    void this.check();
  }

  async apply(): Promise<void> {
    if (!this.swUpdate.isEnabled || this.applying()) return;
    this.applying.set(true);
    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } finally {
      this.applying.set(false);
    }
  }

  private async check(): Promise<void> {
    try {
      if (await this.swUpdate.checkForUpdate()) this.available.set(true);
    } catch {
      // The app remains usable offline and retries the next time it becomes visible.
    }
  }
}
