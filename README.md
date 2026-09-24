# Crimson Centuries

*A vampire's chronicle — London, 1347 to 1901.*

A menu-driven gothic life-sim in plain HTML, CSS and JavaScript. You rise from a plague-pit crypt in the autumn of 1347 and try to survive five and a half centuries of London: the Black Death, the Great Fire, the gin craze, gaslight, and the Autumn of Terror.

## Play

Open `index.html` in any modern browser. There is no build step and nothing to install.
If your browser blocks local files, serve the folder with any static server, for example `python3 -m http.server`, and open `http://localhost:8000`.

Progress saves automatically to `localStorage`. Keys **1–9** pick choices in any scene.

## How it plays

- **Nights and candles.** Each turn is one significant night in a passing moon. Winter nights are long and summer nights are short. Every deed burns hours, so get home before the last candle goes out or the dawn will burn you.
- **The hunt.** Choose a district, then one of three vessels (each with its own humour, vitae and wariness). Then choose an approach: seize, seduce, beguile or mesmerize. Finally, decide how deeply to drink: sip, drink deep, drain, bind them as a ghoul, or make them part of your herd.
- **Humours.** Sanguine, choleric, melancholic and phlegmatic blood each boosts a different attribute for two nights.
- **Humanity and the Beast.** Killing and cruelty erode your soul, while mercy, love and prayer restore it. When Humanity reaches zero, the game ends and the Beast wins. If you starve, you frenzy.
- **Suspicion and hunters.** Careless feeding draws a named hunter who grows more dangerous every night. Track them down, discredit them, or destroy them before they raid your haven at noon.
- **Court of the Night.** Attend Elysium, take the Prince's petitions, scheme against your rival, and climb from Fledgling to Primogen. Then challenge the throne.
- **Circle.** Blood-bound ghouls (bodyguards, stewards, informants, confessors, physicians), a mortal lover who grows old while you do not, and childer of your own.
- **Haven and holdings.** Move up from a shared ossuary to Blackmoor Hall. Buy ventures from each age, from a Southwark alehouse to railway shares.
- **Disciplines.** Eight powers with three ranks each, bought with Essence: Mesmerism, Shadowcraft, the Quickening, Iron Flesh, Dread Majesty, Beastcall, Sanguimancy and Night Wings.
- **Torpor.** Sleep for decades. Hunters forget you, your fortune compounds and your blood thickens, but the people you love may not be there when you wake.
- **History.** Eighteen historical events across four eras, each with its own choices.
- **Endings.** Reach 1901, find the road to Golconda, or meet the Final Death by stake, sun, or the Beast.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Page shell |
| `css/style.css` | All styling (gothic theme, responsive layout) |
| `js/data.js` | Content: bloodlines, eras, districts, people, powers, holdings, events, history, achievements |
| `js/game.js` | Game engine and rules (`G`) |
| `js/ui.js` | Rendering, scenes and input (`UI`) |
| `js/audio.js` | Procedural Web Audio soundtrack and effects (`Snd`) — no audio files |
| `js/fx.js` | Canvas background: fog, ash, bats |
