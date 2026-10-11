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

QA switches: `?platform=memory` (no saves kept), `?analytics=debug` (events to the console), `?qa` (state hook
for browser checks).

**CI setup:** Ymir is a private repository, so CI needs a token to install it. Create a fine-grained personal
access token with read-only *Contents* access to `Radek44/Ymir`, and add it to this repository as the Actions
secret `YMIR_TOKEN`.
