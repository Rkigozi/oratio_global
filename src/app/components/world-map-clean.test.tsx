import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WorldMapClean } from './world-map-clean';
import type { PrayerRequest } from '../services/prayer-data';

const layerOnHandlers: Array<{ event: string; handler: () => void }> = [];
let zoomValue = 4;

const layer = {
  addTo: vi.fn(() => layer),
  on: vi.fn((event: string, handler: () => void) => {
    layerOnHandlers.push({ event, handler });
    return layer;
  }),
  bindTooltip: vi.fn(() => ({ openTooltip: vi.fn() })),
  removeLayer: vi.fn(),
  clearLayers: vi.fn(),
};

const mapInstance = {
  on: vi.fn(() => mapInstance),
  getZoom: vi.fn(() => zoomValue),
  setView: vi.fn(),
  flyTo: vi.fn(),
  invalidateSize: vi.fn(),
  remove: vi.fn(),
};

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => mapInstance),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => layer),
    canvas: vi.fn(() => ({})),
    circleMarker: vi.fn(() => layer),
    latLngBounds: vi.fn(() => ({})),
  },
}));

vi.mock('../hooks/theme-context', () => ({
  useTheme: vi.fn(() => ({ theme: 'dark', themeMode: 'dark', setThemeMode: vi.fn(), toggleTheme: vi.fn() })),
}));

import L from 'leaflet';

const prayer: PrayerRequest = {
  id: 'p1',
  city: 'London',
  country: 'United Kingdom',
  text: 'Pray for my family',
  username: 'testuser',
  prayerCount: 12,
  lat: 51.5,
  lng: -0.1,
};

describe('WorldMapClean', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layerOnHandlers.length = 0;
    zoomValue = 4;
  });

  it('renders the map container', () => {
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} />);
    expect(document.querySelector('.world-map-clean')).toBeTruthy();
  });

  it('creates the Leaflet map with privacy-safe defaults', async () => {
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} />);

    await waitFor(() => expect(L.map).toHaveBeenCalled());

    const [container, options] = vi.mocked(L.map).mock.calls[0] as unknown as [
      HTMLElement,
      Record<string, unknown>,
    ];
    expect(options.center).toEqual([51.5, -0.1]);
    expect(options.zoomControl).toBe(false);
    expect(options.attributionControl).toBe(false);
  });

  it('renders a marker for each prayer', async () => {
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} />);

    await waitFor(() => expect(L.circleMarker).toHaveBeenCalled());

    const markerPositions = vi
      .mocked(L.circleMarker)
      .mock.calls.map((call) => (call as unknown as [[number, number]])[0]);
    expect(markerPositions).toContainEqual([51.5, -0.1]);
  });

  it('fires onPrayerTap when a marker is clicked', async () => {
    const onPrayerTap = vi.fn();
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={onPrayerTap} />);

    await waitFor(() => expect(L.circleMarker).toHaveBeenCalled());

    const clickHandlers = layerOnHandlers.filter((entry) => entry.event === 'click');
    expect(clickHandlers.length).toBeGreaterThan(0);

    clickHandlers[0].handler();
    expect(onPrayerTap).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('adds a nearby-area halo when nearbyArea is set', async () => {
    render(
      <WorldMapClean
        prayers={[prayer]}
        onPrayerTap={() => {}}
        nearbyArea={{ lat: 51.5, lng: -0.1, city: 'London', country: 'UK', markerId: 'p1' }}
      />
    );

    await waitFor(() => expect(L.circleMarker).toHaveBeenCalled());

    const configs = vi
      .mocked(L.circleMarker)
      .mock.calls.map((call) => (call as unknown as [unknown, Record<string, unknown>])[1]);
    expect(configs.some((c) => c?.color === 'rgba(124,143,255,0.42)')).toBe(true);
  });

  it('shows city labels only at higher zoom levels', async () => {
    zoomValue = 8;
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} showCityLabels />);

    await waitFor(() => expect(L.circleMarker).toHaveBeenCalled());

    const bindTooltipCalls = vi.mocked(layer.bindTooltip).mock.calls.map(
      (call) => (call as unknown as [string])[0]
    );
    expect(bindTooltipCalls).toContain('London');
  });

  it('does not show city labels at low zoom levels', async () => {
    zoomValue = 4;
    render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} showCityLabels />);

    await waitFor(() => expect(L.circleMarker).toHaveBeenCalled());

    const bindTooltipCalls = vi.mocked(layer.bindTooltip).mock.calls.map(
      (call) => (call as unknown as [string])[0]
    );
    expect(bindTooltipCalls).not.toContain('London');
  });

  it('removes the map on unmount', async () => {
    const { unmount } = render(<WorldMapClean prayers={[prayer]} onPrayerTap={() => {}} />);

    await waitFor(() => expect(L.map).toHaveBeenCalled());

    unmount();
    expect(mapInstance.remove).toHaveBeenCalled();
  });
});
