import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, Activity } from '../core/models';
import { participation } from '../core/logic/participation';
import { formatTime, relativeStart } from '../core/logic/time';

/** Eine Aktivität in der Liste: Titel, Zeit, Ort, Ersteller, Zusagestand. */
@Component({
  selector: 'app-activity-card',
  imports: [RouterLink],
  template: `
    @let a = activity();
    @let p = progress();
    <a class="card" [class.happening]="p.isHappening" [routerLink]="['/a', a.id]">
      <div class="emoji" aria-hidden="true">{{ category().emoji }}</div>
      <div class="body">
        <div class="top">
          <span class="time">{{ time() }}</span>
          <span class="relative">{{ relative() }}</span>
          @if (a.visibility === 'friends') {
            <span class="tag">Nur Freunde</span>
          }
        </div>
        <h2 class="title">{{ a.title }}</h2>
        <p class="meta">📍 {{ a.placeName }} · von {{ a.creatorFirstName }}</p>

        <div class="progress" role="progressbar" [attr.aria-valuenow]="p.count" [attr.aria-valuemax]="p.min">
          <div class="bar" [style.width.%]="p.ratio * 100"></div>
        </div>
        <div class="status">
          <span class="count">{{ p.label }}</span>
          @if (p.isHappening) {
            <span class="badge">Findet statt</span>
          }
          @if (a.isJoined) {
            <span class="joined">✓ Du bist dabei</span>
          }
        </div>
      </div>
    </a>
  `,
  styleUrl: './activity-card.component.scss',
})
export class ActivityCardComponent {
  readonly activity = input.required<Activity>();
  /** Für «in 25 Min.»; von der Seite übergeben, damit alle Karten gleichzeitig aktualisieren. */
  readonly now = input<Date>(new Date());

  readonly category = computed(() => CATEGORIES[this.activity().category]);
  readonly time = computed(() => formatTime(this.activity().startsAt));
  readonly relative = computed(() => relativeStart(this.activity().startsAt, this.now()));
  readonly progress = computed(() =>
    participation(this.activity().participantCount, this.activity().minParticipants),
  );
}
