/**
 * Where the game runs, chosen once. The web target keeps saves in localStorage; the memory target is for
 * tests and `?platform=memory`. RUN, a Godot bridge or your own host plug in here (Ymir docs/PLATFORMS.md).
 */
import { configurePlatform, initPlatform, loadGame, platformSink, qaParam, saveGame, usePlatform } from 'ymir/platform';
import { webPlatform } from 'ymir/platform/web';
import { memoryPlatform } from 'ymir/platform/memory';
import { consoleSink } from 'ymir/analytics';
import { withTimeout } from 'ymir/core';
import { analytics } from './analytics';
import { SAVE, type Save } from './save';
import { store } from './game';

/** Set up the platform, load the save, start analytics. Returns the save the game starts from. */
export async function boot(): Promise<Save> {
  configurePlatform({ game: 'sub-vesuvio', saveKey: 'sub-vesuvio', fallbackName: 'Player' });
  usePlatform(qaParam('platform') === 'memory' ? memoryPlatform() : webPlatform({ prefix: 'sub-vesuvio:' }));
  analytics.step('boot', 'load_started');
  await withTimeout(initPlatform(), 4000, false);
  const loaded = await loadGame(SAVE);
  // In the store before analytics starts: `persist` saves the store's save, which must be the loaded one.
  store.patch({ save: loaded.state });
  analytics.init({
    sink: qaParam('analytics') === 'debug' ? consoleSink() : platformSink(),
    persisted: loaded.state.funnels,
    persist: (keys) => {
      store.patch({ save: { ...store.get().save, funnels: keys } });
      void saveGame(SAVE, store.get().save);
    },
  });
  analytics.captureErrors();
  return loaded.state;
}
