import { AfterViewInit, Component, ElementRef, OnDestroy, input, viewChild } from '@angular/core';
import * as L from 'leaflet';

/** Kleine, nicht verschiebbare Karte mit einem Punkt (Treffpunkt auf der Detailseite). */
@Component({
  selector: 'app-static-map',
  template: `<div #map class="map"></div>`,
  styles: `
    :host { display: block; height: 100%; }
    .map { width: 100%; height: 100%; }
  `,
})
export class StaticMapComponent implements AfterViewInit, OnDestroy {
  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('map');
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  readonly emoji = input('📍');

  private map?: L.Map;
  private resizeObserver?: ResizeObserver;
  private recenterTimer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    const center: L.LatLngTuple = [this.lat(), this.lng()];
    this.map = L.map(this.mapEl().nativeElement, {
      center,
      zoom: 16,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.map);
    L.marker(center, {
      interactive: false,
      icon: L.divIcon({ className: '', html: `<div class="sp-static-pin">${this.emoji()}</div>`, iconSize: [0, 0] }),
    }).addTo(this.map);

    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
      this.map?.setView(center, 16);
    });
    this.resizeObserver.observe(this.mapEl().nativeElement);
    // Nach der Seiten-Animation von Ionic nochmals zentrieren
    this.recenterTimer = setTimeout(() => {
      this.map?.invalidateSize();
      this.map?.setView(center, 16);
    }, 450);
  }

  ngOnDestroy(): void {
    clearTimeout(this.recenterTimer);
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
