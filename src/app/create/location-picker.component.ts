import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonSearchbar, IonSpinner } from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { GeocodingService, Place } from '../core/geocoding.service';
import { ST_GALLEN } from '../core/logic/geo';

export interface PickedLocation {
  lat: number;
  lng: number;
  /** Vorgeschlagener Name (leer, wenn keiner gefunden wurde). */
  name: string;
}

/**
 * Treffpunkt wählen: Ort suchen ODER auf die Karte tippen.
 * Es wird nur dieser Punkt gespeichert, nie der eigene Standort.
 */
@Component({
  selector: 'app-location-picker',
  imports: [IonSearchbar, IonSpinner],
  template: `
    <div class="search">
      <ion-searchbar
        placeholder="Ort suchen, z. B. Drei Weieren"
        [debounce]="600"
        (ionInput)="onSearch($event.detail.value ?? '')"
        (ionClear)="results.set([])"
      />
      @if (searching()) {
        <ion-spinner name="crescent" class="spin" />
      }
      @if (results().length > 0) {
        <ul class="results">
          @for (r of results(); track $index) {
            <li>
              <button type="button" (click)="choose(r)">
                <strong>{{ r.name }}</strong>
                @if (r.detail) {
                  <span>{{ r.detail }}</span>
                }
              </button>
            </li>
          }
        </ul>
      } @else if (noResults()) {
        <p class="none">Nichts gefunden. Tippe stattdessen auf die Karte.</p>
      }
    </div>
    <div class="map-wrap">
      <div #map class="map"></div>
      @if (!hasPoint()) {
        <div class="hint">Auf die Karte tippen, um den Treffpunkt zu setzen</div>
      }
    </div>
  `,
  styleUrl: './location-picker.component.scss',
})
export class LocationPickerComponent implements AfterViewInit, OnDestroy {
  private readonly geo = inject(GeocodingService);
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');

  readonly picked = output<PickedLocation>();

  readonly results = signal<Place[]>([]);
  readonly searching = signal(false);
  readonly noResults = signal(false);
  readonly hasPoint = signal(false);

  private map?: L.Map;
  private marker?: L.Marker;
  private resizeObserver?: ResizeObserver;
  private searchToken = 0;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl().nativeElement, {
      center: [ST_GALLEN.lat, ST_GALLEN.lng],
      zoom: 14,
      zoomControl: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => void this.setFromMap(e.latlng.lat, e.latlng.lng));

    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapEl().nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  async onSearch(query: string): Promise<void> {
    const token = ++this.searchToken;
    this.noResults.set(false);
    if (query.trim().length < 3) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    try {
      const found = await this.geo.search(query);
      if (token !== this.searchToken) return; // ältere Antwort ignorieren
      this.results.set(found);
      this.noResults.set(found.length === 0);
    } catch {
      if (token === this.searchToken) this.results.set([]);
    } finally {
      if (token === this.searchToken) this.searching.set(false);
    }
  }

  choose(place: Place): void {
    this.results.set([]);
    this.placeMarker(place.lat, place.lng);
    this.map?.setView([place.lat, place.lng], 16);
    this.picked.emit({ lat: place.lat, lng: place.lng, name: place.name });
  }

  private async setFromMap(lat: number, lng: number): Promise<void> {
    this.results.set([]);
    this.placeMarker(lat, lng);
    // Sofort melden (ohne Name), Name nachliefern, sobald die Suche antwortet.
    this.picked.emit({ lat, lng, name: '' });
    try {
      const name = await this.geo.reverse(lat, lng);
      if (name) this.picked.emit({ lat, lng, name });
    } catch {
      /* Name kann man auch selbst eingeben */
    }
  }

  private placeMarker(lat: number, lng: number): void {
    if (!this.map) return;
    const icon = L.divIcon({ className: '', html: '<div class="sp-pick">📍</div>', iconSize: [0, 0] });
    if (this.marker) this.marker.setLatLng([lat, lng]);
    else this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.hasPoint.set(true);
  }
}
