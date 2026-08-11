import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-exercise-media',
  templateUrl: './exercise-media.component.html',
  styleUrl: './exercise-media.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseMediaComponent {
  readonly name = input.required<string>();
  readonly category = input.required<string>();
  readonly imageUrl = input<string>();
  readonly secondaryImageUrl = input<string>();
  readonly videoUrl = input<string>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly playingVideoUrl = signal<string | undefined>(undefined);
  private readonly failedVideoUrl = signal<string | undefined>(undefined);

  protected readonly hasVideo = computed(
    () => Boolean(this.videoUrl()) && this.failedVideoUrl() !== this.videoUrl(),
  );
  protected readonly showVideo = computed(
    () => this.hasVideo() && this.playingVideoUrl() === this.videoUrl(),
  );

  protected readonly youtubeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const videoId = this.youtubeId(this.videoUrl());
    if (!videoId) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&autoplay=1`,
    );
  });

  protected readonly directVideoUrl = computed(() =>
    this.videoUrl() && !this.youtubeId(this.videoUrl()) ? this.videoUrl() : undefined,
  );

  protected playVideo(): void {
    this.playingVideoUrl.set(this.videoUrl());
  }

  protected videoFailed(): void {
    this.failedVideoUrl.set(this.videoUrl());
    this.playingVideoUrl.set(undefined);
  }

  private youtubeId(value: string | undefined): string | undefined {
    if (!value) return undefined;
    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, '');
      let id: string | null = null;
      if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null;
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        id = url.searchParams.get('v');
        if (!id && /^\/(embed|shorts)\//.test(url.pathname)) {
          id = url.pathname.split('/').filter(Boolean)[1] ?? null;
        }
      }
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : undefined;
    } catch {
      return undefined;
    }
  }
}
