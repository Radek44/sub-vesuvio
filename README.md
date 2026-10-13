# Sub Vesuvio

A top-down voxel RPG set in Pompeii in October AD 79. A 12-year-old newcomer from Gaul learns Latin the way
the player does: from graffiti, market talk, a dog that only obeys Latin commands, and people who trust you
once you can talk to them. The mountain is waking up, and someone in town knows.

Latin is the hero's power. Grammar opens doors, wins arguments, commands Ferox and decodes letters, and the
answers adapt to each player: choose, build, fix the ending, write. See [docs/DESIGN.md](docs/DESIGN.md).

Built on [Ymir](https://github.com/Radek44/Ymir), started from its game starter (the coin game below is the
placeholder until the first chapter replaces it).

```sh
npm install
npm run dev        # http://localhost:5180
npm run validate   # typecheck + tests
npm run build      # dist/, a static site
npm run smoke      # the built game boots in Chromium with no errors
```

**Playing:** click or tap where to go, or on someone or something to walk up to it and act (talk, read,
buy, pick up); hovering shows what a click would do, in Latin. Hold the mouse button to walk toward the pointer.
On a touch screen, drag anywhere as a stick. Or use WASD (Shift runs) and E, Space or Enter to act. The mouse
wheel, a trackpad or touch pinch, or + and − zoom from close up to nearly top-down. I/B satchel, J journal,
M map, Esc closes; 1–9 pick an answer. Name tags, shop signs and waymarkers are in Latin; T (or the *Verba*
button, or the title screen) shows their meanings underneath, in the hint language.

QA switches: `?platform=memory` (no saves kept), `?analytics=debug` (events to the console), `?qa` (state hook
for browser checks), `?fps` (frame meter and the quality steps taken), `?quality=high|balanced|low`, `?ladder=0`
(never step quality down: screenshots on software rendering), `?ground=voxel|surface` (the ground spike: drawn as
voxels everywhere, or as a surface everywhere; by default Porta Marina's is a surface).

**CI setup:** Ymir is a private repository, so CI needs a token to install it. Create a fine-grained personal
access token with read-only *Contents* access to `Radek44/Ymir`, and add it to this repository as the Actions
secret `YMIR_TOKEN`.
