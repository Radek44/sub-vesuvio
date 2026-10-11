/** The page: the world behind, the UI in front (ymir/ui components, styled by ymir/ui/y.css). */
import { createRoot } from 'react-dom/client';
import { CTA, CurrencyBar, Joystick, useStore } from 'ymir/ui';
import 'ymir/ui/y.css';
import './styles.css';
import { boot } from './boot';
import { input, newRun, start, store } from './game';
import { GOAL } from './sim';

function Hud() {
  const sim = useStore(store, (v) => v.sim);
  const bestMs = useStore(store, (v) => v.save.bestMs);
  return (
    <>
      <div className="top">
        <CurrencyBar items={[{ id: 'coins', icon: <span className="coin" />, value: sim.got, sub: `of ${GOAL}` }]} />
        <span className="best">{bestMs ? `Best ${(bestMs / 1000).toFixed(1)}s` : ''}</span>
      </div>
      <Joystick onMove={(x, y) => input.touchMove(x, y)}>{!sim.got && <p className="hint">Move with WASD, the arrows, a gamepad or a thumb</p>}</Joystick>
      {sim.over && (
        <div className="bottom">
          <CTA sub={`${(sim.t / 1000).toFixed(1)} seconds`} onClick={newRun}>PLAY AGAIN</CTA>
        </div>
      )}
    </>
  );
}

const save = await boot();
start(document.getElementById('world')!, save);
createRoot(document.getElementById('ui')!).render(<Hud />);
