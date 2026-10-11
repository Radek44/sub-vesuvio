# Sub Vesuvio — agent notes

A top-down voxel RPG in Pompeii, autumn AD 79, where Latin is the hero's power. For any kid learning Latin,
built first for Milo (Latin 8, French–English bilingual) and Lana (almost 12, sharp). One story; the Latin
adapts to each player. **Read `docs/DESIGN.md` before designing anything.**

Built on **Ymir** (`ymir` in package.json, pinned to a commit; private repo, so CI needs the `YMIR_TOKEN`
secret). Ymir's docs are in `node_modules/ymir/docs`: `ADOPTING.md`, `PLATFORMS.md`, `UI.md`. Shared engine
fixes and features go to Ymir first (its roadmap is §13 of the design), then move the pin here.

## Layout (the starter's, until the game replaces it)
- `src/sim.ts`: the rules. PURE fixed-step `step(state, input) → state`, seed in the state, a `StepSim`.
- `src/game.ts`: the controller, the only place that combines sim, input, saves, analytics and the world.
- `src/world.ts`: the scene on a ymir/three `Stage`; reads state, never writes it.
- `src/main.tsx` + `src/styles.css`: the UI (ymir/ui, themed). `src/save.ts`: the versioned save.
  `src/analytics.ts`: funnels. `src/boot.ts`: platform, save, analytics.
- `src/lingua/`: the Latin engine, pure, no Ymir (`index.ts` barrel). `lexicon.ts` (entries with macrons, en/fr,
  grammar point; irregular forms listed, never guessed), `forms.ts` (generator), `analyse.ts` (every reading of a
  form), `check.ts` (the answer ladder: choose/build/endings/write against a frame; feedback codes in
  `FEEDBACK_CODES`), `lint.ts` (content lint; Latin inside English or French text goes in «guillemets», a fully
  Latin dialogue line has `notes.la: true`), `roman.ts`, `normalize.ts` (Roma's answer normalisation + i/j, u/v).
  Tests in `test/lingua/`; `reference.ts` there is the hand-entered paradigm table, never generated.
- Planned (see the design): `content/` (chapters, dialogue, puzzles, lessons as data).

## Rules: the game
- The sim and `lingua` never read the clock, the DOM, Three.js or the platform, and never call
  `Math.random`. `test/architecture.test.ts` enforces it for both.
- A change to the save's shape bumps its version and adds a migration, with a test loading a real old save.
- Analytics: `analytics.step`/`track` from the controller only; no free text in payloads.
- `npm run validate` before every commit; CI also builds and runs `npm run smoke`.

## Rules: the Latin and the kids
- **Latin is checked by the game, never by hand-waving.** Every Latin line parses with `lingua`, every word is
  in the lexicon, every puzzle is solvable, every intended answer is accepted and every listed wrong answer is
  rejected with the right feedback. Generated forms are cross-checked against an independent inflection table.
  A failure here fails the build. No human sign-off gates a release.
- Answers are graded by rules (`lingua`), never by a language model. A model may give hints later; it never
  decides what's correct and never sees a child's data.
- No timers on any Latin answer; Latin moments pause the world. Teach before testing; explain a wrong answer,
  then retry. Never hard-lock progress: a stuck player is slowed (hint, lesson, an easier answer step), never stopped.
- Jokes sit around the learning, never at the learner's expense.
- Macrons are optional in typed answers; i/j and u/v are interchangeable.
- Latin is spoken only by human recordings or reviewed voices; a pleasant voice is not evidence of correct
  pronunciation. Classical pronunciation.
- No child data leaves the device except the opt-in parent/teacher progress report (design §14): summaries
  only, double opt-in, unsubscribe in every email.
- Every real Pompeian text used in the game cites its published source in the content data.
