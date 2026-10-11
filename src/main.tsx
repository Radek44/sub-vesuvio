/** The page: the world behind, the UI in front. */
import { createRoot } from 'react-dom/client';
import { useStore } from 'ymir/ui';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/800.css';
import '@fontsource/noto-serif/400.css';
import '@fontsource/noto-serif/400-italic.css';
import '@fontsource/noto-serif/700.css';
import './styles.css';
import { boot } from './boot';
import { start, store } from './game';
import { Title } from './ui/Title';
import { Hud, Loading } from './ui/Hud';
import { Dialogue } from './ui/Dialogue';

function App() {
  const screen = useStore(store, (v) => v.screen);
  if (screen === 'title') return <Title />;
  if (screen === 'loading') return <Loading />;
  return (
    <>
      <Hud />
      <Dialogue />
    </>
  );
}

const save = await boot();
start(document.getElementById('world')!, save);
createRoot(document.getElementById('ui')!).render(<App />);
