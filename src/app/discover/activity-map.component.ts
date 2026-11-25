import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { participation } from '../core/logic/participation';
import { ST_GALLEN } from '../core/logic/geo';
import { formatTime } from '../core/logic/time';
import { Activity, CATEGORIES } from '../core/models';

/** Karte mit allen Aktivitäten (Leaflet + OpenStreetMap). Antippen öffnet die Aktivität. */
@Component({
  selector: 'app-activity-map',
  template: `<div #map class="map"></div>`,
  styleUrl: './activity-map.component.scss',
})
export class ActivityMapComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  readonly activities = input.required<Activity[]>();

  private map?: L.Map;
  private markers = L.layerGroup();
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Marker neu zeichnen, sobald sich die Liste ändert.
    effect(() => this.renderMarkers(this.activities()));
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl().nativeElement, {
      center: [ST_GALLEN.lat, ST_GALLEN.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
    this.markers.addTo(this.map);
    this.renderMarkers(this.activities(), true);

    // Ionic blendet Seiten animiert ein; Leaflet muss danach seine Grösse neu messen.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapEl().nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private renderMarkers(activities: Activity[], fit = false): void {
    if (!this.map) return;
    this.markers.clearLayers();

    for (const a of activities) {
      const p = participation(a.participantCount, a.minParticipants);
      const icon = L.divIcon({
        className: '',
        html: `<div class="sp-pin${p.isHappening ? ' happening' : ''}">
                 <span class="sp-pin-emoji">${CATEGORIES[a.category].emoji}</span>
                 <span class="sp-pin-count">${p.count}/${p.min}</span>
               </div>`,
        // Grösse 0: Der Pin positioniert sich per CSS selbst, die Spitze liegt genau auf dem Treffpunkt.
        iconSize: [0, 0],
      });
      const marker = L.marker([a.lat, a.lng], { icon, title: `${formatTime(a.startsAt)} ${a.title}` });
      marker.on('click', () => this.router.navigate(['/a', a.id]));
      this.markers.addLayer(marker);
    }

    if (fit && activities.length > 0) {
      const bounds = L.latLngBounds(activities.map((a) => [a.lat, a.lng] as L.LatLngTuple));
      this.map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
  }
}
