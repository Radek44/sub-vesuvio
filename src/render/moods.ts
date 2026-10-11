/**
 * Sub Vesuvio's moods: Ymir's presets warmed for the Bay of Naples in October, and thinned of fog so the
 * town reads crisp near the hero while the curved horizon still hazes into the bay.
 */
import { MOODS, type Mood } from 'ymir/three';

export const BAY: Record<'arrival' | 'noon' | 'golden' | 'dusk' | 'night', Mood> = {
  /** Morning off the ship: low sun from the east, a little sea haze. */
  arrival: { ...MOODS.morning, fogDensity: 0.0045, fog: 0xead9bf, horizon: 0xf5ddb8, zenith: 0x5b97d8, sunIntensity: 2.8, elevation: 0.5, azimuth: -1.1, clouds: 0.2 },
  noon: { ...MOODS.noon, fogDensity: 0.0035 },
  golden: { ...MOODS.golden, fogDensity: 0.004 },
  dusk: { ...MOODS.dusk, fogDensity: 0.006 },
  night: { ...MOODS.night, fogDensity: 0.006 },
};
