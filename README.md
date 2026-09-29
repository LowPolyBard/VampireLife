# Crimson Centuries

*A vampire's chronicle — London, 1347 to 1901, in the first person.*

You wake in a plague-pit crypt in the autumn of 1347 and walk a procedurally generated London with your own dead eyes. Hunt its people, climb its Court of the Night, and survive five and a half centuries of plague, fire, gin and gaslight. Built with Three.js and plain HTML, CSS and JavaScript.

## Play

Serve the folder with any static server and open it in a browser:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly also works in most browsers. Progress saves automatically to `localStorage`.

**Keys:** WASD move · mouse look (click to capture) · Shift run · C skulk · Space leap · **E / F / G** act (some actions must be held) · Q blood sense · R mend flesh · Tab grimoire · M map · Esc pause. Touch devices get a thumbstick and buttons.

## How it plays

Everything happens in the world. There are no dialogue choices.

- **The city is procedural.** Every chronicle generates its own London: a winding river with bridges and quays, seven districts, dense alleys, plazas, and landmarks like St Paul's, Westminster Hall, a Bankside playhouse, the plague pits, and a city wall. The same street plan is rebuilt in each age: timber, jetties and thatch; then Tudor brick; then Georgian sash windows and parapets; then soot-black Victorian terraces under gaslight. Every night rolls its own weather: mist, fog, rain, snow, smoke, or a blood moon.
- **The night burns.** The candles at the top of the screen are the hours until dawn, and they burn down in real time. Every deed spends more of them. If you are not in your coffin when the last one gutters, the sun finds you.
- **Hunting.** Every mortal in the street is a person with a name, a trade, a humour and a heartbeat.
  - **Seize** (E): creep up behind a mortal, ideally in shadow with no one watching. This uses Might.
  - **Beckon** (F): a mortal who faces you may follow you into the dark. This uses Allure.
  - **Hold their gaze** (hold G): leaves them entranced. This needs Mesmerism.
  - **Drink** (hold E): let go early and they stagger off dreaming. Drink past the golden mark and you take them deep. Keep drinking and their heart stops.
  - **Bind** (F while drinking): make them your ghoul.
- **Stealth.** The eye at the bottom of the screen shows how exposed you are. Lamps betray you and shadows hide you. Mortals who notice you show **?** and then **!**, turn to stare, or scream and flee. Witnesses raise suspicion, and bodies left in the street are found; hold E on a corpse to drag it into the dark.
- **The watch and the hunter.** If the watch catches you, you must bribe them, break free, or hold their gaze before they drag you to the watch-house. When suspicion brings a hunter, they walk the streets with crossbow and stake, and you fight them hand to hand. You can also track them to their lodging and break down the door.
- **The Beast.** Starve and you frenzy: hammer E to chain it, or wake with a stranger dead in your arms. Humanity falls with every killing, and at zero the chronicle ends.
- **Places.** A lantern marks every door that matters. Taverns hold gambling, carousing and rumours; there are also the stews, the cathedral, the guildhall, the watch-house, the almshouse and the charnel chapel. Elysium hides behind a red lantern: attend court, take and deliver the Prince's petitions, scheme against your rival, and one night challenge the throne.
- **Your haven** is a room you stand in: coffin, writing desk, mirror, and your herd, lover, ghouls and childer. Better havens are for sale around the city.
  - From the coffin you sleep until dusk, or sink into torpor for decades.
  - The desk opens your grimoire: attributes, disciplines, holdings, haven upgrades, court petitions, and the Red Ledger of everyone you have killed.

## Code layout

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and boot |
| `vendor/three.min.js` | Three.js r149 |
| `css/style.css`, `css/world.css` | Gothic interface; HUD, captions and grimoire overlay |
| `js/data.js` | Bloodlines, eras, districts, people, powers, holdings, history |
| `js/game.js` | The chronicle engine (`G`): rules, feeding, court, torpor, endings |
| `js/world/util.js` | Seeded RNG, noise, batched geometry builder |
| `js/world/tex.js` | Procedural pixel textures |
| `js/world/town.js` | City generator (`generate`) and era-styled builder (`build`) |
| `js/world/people.js` | Mortals: appearance, pathfinding, perception, panic |
| `js/world/interior.js` | The haven interior |
| `js/world/world.js` | Renderer, post-process, sky & weather, player, clock, all interactions |
| `js/world/hud.js` | Heads-up display |
| `js/ui.js` | Title, creation, grimoire, map, captions and notes |
| `js/audio.js` | Procedural Web Audio (no audio files) |
