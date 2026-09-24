/* ==========================================================
   CRIMSON CENTURIES — static data: bloodlines, eras, places,
   people, powers, holdings, events and the history of London.
   Event functions receive the live state `s` and use the `G`
   helper API defined in game.js.
   ========================================================== */

const DATA = {};

DATA.MOONS = ['Wolf Moon', 'Snow Moon', 'Worm Moon', 'Pink Moon', 'Flower Moon', 'Strawberry Moon',
  'Buck Moon', 'Sturgeon Moon', 'Harvest Moon', "Hunter's Moon", 'Beaver Moon', 'Cold Moon'];
DATA.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
// Long winter nights, short summer ones.
DATA.SEASON_HOURS = [2, 1, 0, 0, -1, -2, -2, -1, 0, 0, 1, 2];

DATA.ERAS = [
  { id: 'medieval', name: 'The Age of Plague & Crowns', short: 'Medieval', start: 1347, glyph: '✠', money: 1,
    desc: 'London is a warren of timber, thatch and smoke. Bells mark every hour, the Church marks every soul, and the dark between the torches belongs to you.' },
  { id: 'tudor', name: 'The Age of Reformation', short: 'Tudor', start: 1485, glyph: '♛', money: 1.6,
    desc: 'A new dynasty sits the throne. Monasteries fall, playhouses rise in Southwark, and witch-finders sharpen their stakes with Protestant zeal.' },
  { id: 'georgian', name: 'The Age of Reason', short: 'Georgian', start: 1666, glyph: '⚖', money: 2.6,
    desc: 'The old city burned and rose again in brick and Portland stone. Coffee, credit and scandal flow; philosophers now ask what the priests only feared.' },
  { id: 'victorian', name: 'The Age of Smoke & Gaslight', short: 'Victorian', start: 1837, glyph: '⚙', money: 4,
    desc: 'The greatest city on earth chokes on its own soot. Gaslight devours the shadows, the railways never sleep, and the newspapers hunger for murder.' },
];

DATA.RANKS = [
  { name: 'Fledgling', prestige: 0, potency: 1 },
  { name: 'Neonate', prestige: 15, potency: 1 },
  { name: 'Ancilla', prestige: 40, potency: 2 },
  { name: 'Elder', prestige: 80, potency: 4 },
  { name: 'Primogen', prestige: 130, potency: 5 },
  { name: 'Prince of London', prestige: 99999, potency: 99 },
];

DATA.ATTRS = {
  might: { name: 'Might', glyph: '⚔', desc: 'Strength, violence and endurance of the corpse.' },
  guile: { name: 'Guile', glyph: '☍', desc: 'Stealth, deceit and the art of the knife in the dark.' },
  allure: { name: 'Allure', glyph: '❦', desc: 'Seduction, presence and the terrible beauty of the dead.' },
  lore: { name: 'Lore', glyph: '☥', desc: 'Occult learning, memory and the will to command.' },
};

DATA.HUMOURS = {
  sanguine: { name: 'Sanguine', color: '#e0485e', attr: 'allure', desc: 'warm and heady — the blood of lovers and revellers' },
  choleric: { name: 'Choleric', color: '#e8923a', attr: 'might', desc: 'hot and bitter — the blood of the wrathful' },
  melancholic: { name: 'Melancholic', color: '#7d8fe0', attr: 'lore', desc: 'cold and heavy — the blood of the grieving and the thoughtful' },
  phlegmatic: { name: 'Phlegmatic', color: '#86c29a', attr: 'guile', desc: 'cool and placid — the blood of the patient and the sly' },
};

DATA.CLANS = [
  { id: 'morvayne', name: 'House Morvayne', epithet: 'The Silken Court', sigil: '❦', bonus: { allure: 2 },
    affinity: ['mesmerism', 'majesty'], sire: 'Lady Séverine Morvayne',
    desc: 'Aristocrats of the night who rule through adoration. Their courts are perfumed, their smiles are knives.',
    flaw: 'Refined Palate — the blood of the lowborn nourishes you only half as well.' },
  { id: 'vargr', name: 'The Vargr', epithet: 'Wolves of the Old Forest', sigil: '☾', bonus: { might: 2 },
    affinity: ['beastcall', 'ironflesh'], sire: 'Old Ulfric of the Weald',
    desc: 'Savage predators who came down from the northern forests with the Danes. The Beast in them is close to the skin.',
    flaw: 'The Hunger Howls — you frenzy more readily, and hunger bites harder.' },
  { id: 'hollow', name: 'The Hollow Choir', epithet: 'Those Who Wear No Faces', sigil: '☉', bonus: { guile: 2 },
    affinity: ['shadowcraft', 'nightwings'], sire: 'the one they call Mother Hush',
    desc: 'Their Embrace strips away the face. They live in crypts and sewers, and know every secret London has buried.',
    flaw: 'Corpse-Visage — seduction falters (−2 Allure when hunting) and the high-born recoil from you.' },
  { id: 'ashen', name: 'Order of the Ashen Codex', epithet: 'Blood-Scholars', sigil: '⚶', bonus: { lore: 2 },
    affinity: ['sanguimancy', 'mesmerism'], sire: 'Magister Corvin Hale',
    desc: 'A hermetic order that treats vitae as a sacred text. Every drop can be read, bound or spent.',
    flaw: 'The Tithe — each New Year the Codex claims a tenth of your wealth.' },
  { id: 'unclaimed', name: 'The Unclaimed', epithet: 'Orphans of the Night', sigil: '✧', bonus: { might: 1, guile: 1, allure: 1 },
    affinity: [], sire: 'a stranger who never gave a name',
    desc: 'Embraced and abandoned. No bloodline claims you — and no bloodline binds you. The dawn is strangely gentler on thin blood.',
    flaw: 'Scorned — the Court grants you only two-thirds of the prestige others earn. (But the sun burns you half as badly.)' },
];

DATA.ORIGINS = [
  { id: 'noble', name: 'Disinherited Noble', bonus: { allure: 1 }, gold: 120, humanity: 60, inf: { crown: 15 },
    desc: 'A younger child of a great house, taught Latin and falconry and then left with nothing.',
    memory: 'the smell of rushes on your father\'s hall floor, and a hound that loved you' },
  { id: 'cleric', name: 'Fallen Cleric', bonus: { lore: 1 }, gold: 30, humanity: 75, inf: { church: 20 },
    desc: 'You took holy orders and broke them. You still know every psalm — they simply burn now.',
    memory: 'the cold of the cloister at Matins, and the voices of your brothers rising in the dark' },
  { id: 'soldier', name: 'Veteran of Crécy', bonus: { might: 1 }, gold: 55, humanity: 55, inf: { crown: 5, underworld: 5 },
    desc: 'You drew a longbow for King Edward in France and came home with nothing but nightmares.',
    memory: 'the hiss of ten thousand arrows over the mud at Crécy, and the friend who did not come home' },
  { id: 'thief', name: 'Cutpurse of Southwark', bonus: { guile: 1 }, gold: 40, humanity: 55, inf: { underworld: 20 },
    desc: 'Born in the stews, raised by the gutter. Every lock in London once looked like an invitation.',
    memory: 'your mother singing in the tavern where she worked, before the fever took her' },
  { id: 'merchant', name: 'Wool Merchant\'s Heir', bonus: { lore: 1 }, gold: 200, humanity: 60, inf: { guilds: 20 },
    desc: 'Your family ledger was your first bible. You still count the coins in a dying purse by instinct.',
    memory: 'bales of Cotswold wool in the warehouse, and your sister laughing as you fell into them' },
  { id: 'courtesan', name: 'Courtesan', bonus: { allure: 1 }, gold: 70, humanity: 60, inf: { underworld: 10, crown: 5 },
    desc: 'Lords paid for your company and confided their secrets. Your sire paid the highest price of all.',
    memory: 'a rose left on your windowsill by someone who never asked for anything' },
];

DATA.POWERS = {
  mesmerism: { name: 'Mesmerism', glyph: '◉', desc: 'The gaze that commands and the voice that erases.',
    ranks: ['Unlock “Mesmerize” when hunting (Lore-based, +3).',
      'Unlock “Cloud Memories”: an hour’s work unmakes −12 Suspicion.',
      'Puppet Strings: +10% to every social and hunting roll; hunters can be made to forget you.'] },
  shadowcraft: { name: 'Shadowcraft', glyph: '◐', desc: 'Darkness that clings like a cloak.',
    ranks: ['Suspicion from feeding reduced by 25%.',
      'Suspicion from feeding reduced by 50%; failed hunts let you vanish unseen.',
      'Hunters lose your trail: their threat grows half as fast. +1 Guile.'] },
  quickening: { name: 'The Quickening', glyph: '⟁', desc: 'The blood burns faster than time.',
    ranks: ['+1 hour each night.', '+2 hours each night.', '+3 hours each night and +1 Might.'] },
  ironflesh: { name: 'Iron Flesh', glyph: '⛨', desc: 'Dead skin hardened like cured leather and cold stone.',
    ranks: ['All harm reduced by 25%.', 'All harm reduced by 40%; the dawn burns you half as badly.',
      'All harm reduced by 55%; +1 Might.'] },
  majesty: { name: 'Dread Majesty', glyph: '♔', desc: 'The awe that makes mortals kneel and Kindred bow.',
    ranks: ['+1 Allure; influence gains +25%.', 'Prestige gains +25%.', '+1 further Allure; revels and balls never fail.'] },
  beastcall: { name: 'Beastcall', glyph: '♞', desc: 'Rats, crows and wolves answer your call.',
    ranks: ['Unlock “Call the Vermin” anywhere: feed without sin.',
      'Rats spy for you: hunter threat −4 each night.', 'Wolves guard your haven: +3 defence; vermin feed doubled.'] },
  sanguimancy: { name: 'Sanguimancy', glyph: '⚶', desc: 'Blood sorcery of the old codices.',
    ranks: ['Mending flesh costs half as much blood.',
      'Blood Cellar holds twice as much; draining yields +50% Essence.',
      'Unlock “Rite of Crimson Sight”: reveal a hunter’s lair at once.'] },
  nightwings: { name: 'Night Wings', glyph: '⋀', desc: 'Mist, bat and raven — the city is one rooftop.',
    ranks: ['Travel between districts costs no time.', '+1 Guile; failed hunts never wound you as you flee.',
      'Returning to your haven costs no time. The dawn cannot catch you.'] },
};

DATA.HAVENS = [
  { name: 'A Crypt beneath St Bartholomew\'s', cost: 0, def: 1, ghouls: 1, herd: 2,
    desc: 'A damp ossuary shared with the bones of plague-dead monks. It is quiet, at least.' },
  { name: 'A Cellar beneath a Chandler\'s Shop', cost: 90, def: 2, ghouls: 2, herd: 3,
    desc: 'Tallow-reek and a stout oak door. The chandler asks no questions and pays his rent to you.' },
  { name: 'A Shuttered Townhouse', cost: 350, def: 3, ghouls: 3, herd: 5,
    desc: 'Four storeys of shuttered windows on a respectable street. The neighbours think you a recluse.' },
  { name: 'A Walled Manor at Highgate', cost: 1300, def: 5, ghouls: 5, herd: 8,
    desc: 'Cedars, high walls and a view over the smoking city. Servants who never see you by day.' },
  { name: 'Blackmoor Hall', cost: 4200, def: 8, ghouls: 7, herd: 12,
    desc: 'A gothic pile of turrets and chapels that has swallowed three families. It has been waiting for you.' },
];

DATA.UPGRADES = {
  doors: { name: 'Iron-bound Doors', cost: 60, lvl: 0, desc: '+2 haven defence against raids.' },
  cellar: { name: 'Blood Cellar', cost: 180, lvl: 1, desc: 'Store surplus blood in stoppered jars (40 measures). Drawn automatically when you starve.' },
  sarcophagus: { name: 'Hidden Sarcophagus', cost: 150, lvl: 1, desc: 'Raids harm you only half as much; your haven survives the long sleep of torpor.' },
  library: { name: 'Occult Library', cost: 320, lvl: 2, desc: 'Unlocks “Study the Forbidden” at your haven.' },
  kennels: { name: 'Hound Kennels', cost: 200, lvl: 2, desc: '+2 haven defence. The hounds howl when strangers come.' },
  chapel: { name: 'Chapel of Memory', cost: 260, lvl: 2, desc: 'Lost Humanity slowly returns (+1 each moon while below 50).' },
  gallery: { name: 'Gallery of Masks', cost: 450, lvl: 3, desc: '+1 Allure. Visitors leave dazzled, and speak well of you at Elysium.' },
};

DATA.HOLDINGS = [
  { id: 'alehouse', name: 'The Crooked Cup Alehouse', from: 1347, cost: 120, inc: 6, fx: { herdCap: 1 }, desc: 'A Southwark alehouse. Drunk patrons make easy herd.' },
  { id: 'mill', name: 'A Watermill on the Fleet', from: 1347, cost: 220, inc: 11, fx: {}, desc: 'Grinds grain and gold alike.' },
  { id: 'relics', name: 'A Trade in False Relics', from: 1347, to: 1560, cost: 160, inc: 9, fx: { church: 1, humYear: -1 }, desc: 'Pig bones sold as saints. +1 Church each moon; −1 Humanity each year.' },
  { id: 'wool', name: 'Shares in the Wool Staple', from: 1347, cost: 420, inc: 23, fx: { guilds: 1 }, desc: 'England runs on wool. +1 Guilds each moon.' },
  { id: 'printing', name: 'A Printing Press', from: 1476, cost: 460, inc: 20, fx: { suspDecay: 2 }, desc: 'Pamphlets that mock superstition. Suspicion fades faster.' },
  { id: 'playhouse', name: 'A Playhouse on Bankside', from: 1576, cost: 620, inc: 32, fx: { herdCap: 2 }, desc: 'Players, groundlings and admirers who come willingly to the stage door.' },
  { id: 'muscovy', name: 'Venturer Shares', from: 1555, cost: 900, inc: 55, fx: {}, desc: 'Ships to Muscovy and the Indies. Rich — while the ships come home.' },
  { id: 'coffee', name: 'A Coffeehouse in Change Alley', from: 1680, cost: 800, inc: 40, fx: { crown: 1 }, desc: 'Where brokers, wits and ministers talk too freely. +1 Crown each moon.' },
  { id: 'gin', name: 'A Gin Palace', from: 1700, cost: 700, inc: 46, fx: { herdCap: 2, humYear: -2 }, desc: 'Mother\'s Ruin by the pint. −2 Humanity each year.' },
  { id: 'bank', name: 'Bank of England Stock', from: 1694, cost: 2000, inc: 110, fx: {}, desc: 'The safest vault in the world is a ledger.' },
  { id: 'eic', name: 'East India Company Shares', from: 1700, cost: 3000, inc: 190, fx: { humYear: -2 }, desc: 'An empire of tea and blood. −2 Humanity each year.' },
  { id: 'gasco', name: 'The Gas Light & Coke Company', from: 1812, cost: 1500, inc: 90, fx: {}, desc: 'Profit from the very light that hunts you.' },
  { id: 'railway', name: 'Railway Shares', from: 1837, cost: 5000, inc: 320, fx: { guilds: 1 }, desc: 'Iron roads across the kingdom. +1 Guilds each moon.' },
  { id: 'musichall', name: 'A Music Hall in the East End', from: 1840, cost: 2500, inc: 140, fx: { herdCap: 3 }, desc: 'Gaslit stage, gin and adoring crowds.' },
  { id: 'factory', name: 'A Cotton Mill', from: 1837, cost: 4000, inc: 280, fx: { humYear: -3 }, desc: 'Children at the looms, fourteen hours a day. −3 Humanity each year.' },
  { id: 'hospital', name: 'A Charity Hospital', from: 1840, cost: 3000, inc: 0, fx: { bloodTurn: 14, humYear: 2 }, desc: 'You heal the poor — and quietly keep what they bleed. +14 blood each moon; +2 Humanity each year.' },
];

DATA.ITEMS = {
  golconda: { name: 'Fragment of the Golconda Codex', glyph: '✦', desc: 'A leaf of vellum speaking of a road beyond the Beast. Gather three — then, with Humanity 90, Lore 6 and a century and a half of undeath behind you, seek Golconda.' },
  candle: { name: 'Candle of Heart\'s Tallow', glyph: '🕯', desc: 'Burn it to steal one more hour from the night.', use: true },
  ring: { name: 'Signet from a Noble Grave', glyph: '◎', desc: 'Old gold. Worth a tidy sum to the right fence.', sell: 45 },
  bone: { name: 'Saint\'s Knucklebone', glyph: '✝', desc: 'A true relic. It stings to hold. The clergy would pay in favours.', use: true },
  vitae: { name: 'Vial of Elder Vitae', glyph: '⚱', desc: 'Thick, black, ancient blood. Drink it to gain 12 Essence.', use: true },
  salve: { name: 'Alchemist\'s Sun-Salve', glyph: '☀', desc: 'Protects you from one dawn\'s burning.' },
};

/* --- places ------------------------------------------------ */
DATA.DISTRICTS = [
  { id: 'cheapside', glyph: '⚖', heat: 1.0, danger: 2, vit: 1,
    names: { medieval: 'Cheapside Market', tudor: 'Cheapside', georgian: 'Cheapside & the Poultry', victorian: 'Cheapside' },
    desc: {
      medieval: 'Goldsmiths\' shutters, fishwives\' curses and the Eleanor Cross standing over it all. The richest street in the realm.',
      tudor: 'Goldsmiths\' Row glitters behind barred windows. Apprentices riot here on May Day.',
      georgian: 'Merchants in powdered wigs and a thousand shop-signs creaking in the wind.',
      victorian: 'Omnibuses, clerks and the great roar of the City. Even at midnight, someone is counting money.' },
    occ: ['merchant', 'goldsmith', 'apprentice', 'fishwife', 'beggar', 'clerk', 'watchman'],
    actions: ['hunt', 'swindle', 'guildhall', 'rumours'] },
  { id: 'southwark', glyph: '♣', heat: 0.8, danger: 3, vit: 1,
    names: { medieval: 'The Southwark Stews', tudor: 'Bankside', georgian: 'The Borough', victorian: 'Southwark' },
    desc: {
      medieval: 'Across the Bridge, outside the City\'s law: bathhouses, brothels and bear-pits licensed by the Bishop himself.',
      tudor: 'Playhouses and bear-gardens. The crowds are drunk, loud and wonderfully careless.',
      georgian: 'Coaching inns and debtors\' prisons. Everyone here owes someone something.',
      victorian: 'Hop warehouses and tenements. The river-fog rolls thickest here.' },
    occ: ['harlot', 'drunk', 'actor', 'sailor', 'apprentice', 'watchman'],
    actions: ['hunt', 'gamble', 'cultivate', 'carouse'] },
  { id: 'stpauls', glyph: '✝', heat: 1.6, danger: 3, vit: 1,
    names: { medieval: 'St Paul\'s Churchyard', tudor: 'St Paul\'s Churchyard', georgian: 'St Paul\'s Cathedral', victorian: 'St Paul\'s Cathedral' },
    desc: {
      medieval: 'The great Gothic spire, tallest in Christendom. Holy ground — it prickles against your dead skin.',
      tudor: 'Booksellers crowd the churchyard. Paul\'s Walk is full of gossips, thieves and preachers.',
      georgian: 'Wren\'s great dome, risen from the ashes. The Whispering Gallery carries every secret.',
      victorian: 'The dome looms over soot and fog. The clergy here are learned, and some of them believe.' },
    occ: ['priest', 'nun', 'friar', 'curate', 'pilgrim', 'scholar', 'beggar'],
    actions: ['hunt', 'confess', 'archives', 'tithe'] },
  { id: 'westminster', glyph: '♛', heat: 1.4, danger: 2, vit: 1.25,
    names: { medieval: 'Westminster', tudor: 'Whitehall', georgian: 'St James\'s', victorian: 'Mayfair' },
    desc: {
      medieval: 'The Abbey, the Hall and the King\'s palace. Silk, candlelight and ambition.',
      tudor: 'Whitehall Palace sprawls along the river, full of courtiers who would sell their mothers for favour.',
      georgian: 'Gentlemen\'s clubs, gaming tables and masquerades. Fortunes are lost before breakfast.',
      victorian: 'Townhouses of the rich, glittering balls and scandals whispered behind fans.' },
    occ: ['lady', 'lord', 'courtier', 'knight', 'officer', 'dandy', 'clerk'],
    actions: ['hunt', 'ball', 'blackmail'] },
  { id: 'docks', glyph: '⚓', heat: 0.6, danger: 4, vit: 1,
    names: { medieval: 'Billingsgate Wharf', tudor: 'The Legal Quays', georgian: 'Wapping Docks', victorian: 'The East India Docks' },
    desc: {
      medieval: 'Fish, salt and wine casks from Gascony. Sailors vanish every night; no one counts them.',
      tudor: 'Ships from Antwerp and the New World. Smugglers own the darkness under the quays.',
      georgian: 'Execution Dock, where pirates hang until three tides wash over them.',
      victorian: 'A forest of masts and a maze of warehouses. Lascars, dockers and opium.' },
    occ: ['sailor', 'docker', 'fishwife', 'drunk', 'merchant', 'opium'],
    actions: ['hunt', 'smuggle', 'bribewatch'] },
  { id: 'whitechapel', glyph: '☗', heat: 0.7, danger: 3, vit: 0.9,
    names: { medieval: 'Aldgate Without', tudor: 'Whitechapel', georgian: 'Whitechapel', victorian: 'Whitechapel' },
    desc: {
      medieval: 'Beyond the city wall: tanneries, bell-foundries and those too poor for the City.',
      tudor: 'Slaughterhouses and cheap lodging. The stink keeps the gentry away.',
      georgian: 'Gin-shops, rookeries and the Royal London Hospital\'s charity wards.',
      victorian: 'Common lodging-houses, fog and hunger. Nobody sees anything here — until they do.' },
    occ: ['beggar', 'urchin', 'washer', 'factorygirl', 'butcher', 'harlot', 'opium', 'drunk'],
    actions: ['hunt', 'charity', 'track'] },
  { id: 'graveyard', glyph: '☠', heat: 0.8, danger: 2, vit: 0.9,
    names: { medieval: 'The Smithfield Plague Pits', tudor: 'The Charterhouse Grounds', georgian: 'Bunhill Fields', victorian: 'Highgate Cemetery' },
    desc: {
      medieval: 'Great trenches of the dead beside the Charterhouse. The ground breathes.',
      tudor: 'Old burial grounds of the plague years, where the Carthusians were martyred.',
      georgian: 'The dissenters\' burial ground. Resurrection men dig by lantern-light.',
      victorian: 'Catacombs and the Egyptian Avenue. The city\'s most fashionable place to rot.' },
    occ: ['gravedigger', 'resurrection', 'medium', 'drunk', 'priest'],
    actions: ['rats', 'commune', 'dig', 'hunt'] },
];

/* --- people ------------------------------------------------ */
DATA.OCC = {
  beggar: { n: 'beggar', cls: 'low', vit: [10, 16], wary: [1, 2], role: 'spy' },
  urchin: { n: 'street urchin', cls: 'low', vit: [8, 14], wary: [2, 4], role: 'spy' },
  washer: { n: 'washerwoman', cls: 'low', vit: [12, 20], wary: [1, 3] },
  drunk: { n: 'drunkard', cls: 'low', vit: [12, 20], wary: [0, 2] },
  harlot: { n: 'harlot', cls: 'low', vit: [14, 22], wary: [2, 4], role: 'spy' },
  sailor: { n: 'sailor', cls: 'low', vit: [18, 26], wary: [2, 5], role: 'guard' },
  docker: { n: 'dockhand', cls: 'low', vit: [18, 28], wary: [2, 4], role: 'guard' },
  fishwife: { n: 'fishwife', cls: 'low', vit: [16, 22], wary: [2, 4] },
  gravedigger: { n: 'gravedigger', cls: 'low', vit: [16, 22], wary: [2, 4], role: 'guard' },
  pilgrim: { n: 'pilgrim', cls: 'low', vit: [14, 20], wary: [1, 3], eras: ['medieval', 'tudor'] },
  actor: { n: 'player', cls: 'low', vit: [14, 22], wary: [2, 4], role: 'spy', eras: ['tudor', 'georgian', 'victorian'] },
  factorygirl: { n: 'match-girl', cls: 'low', vit: [12, 18], wary: [1, 3], eras: ['victorian'] },
  opium: { n: 'opium eater', cls: 'low', vit: [8, 14], wary: [0, 1], eras: ['victorian'] },
  resurrection: { n: 'resurrection man', cls: 'low', vit: [16, 24], wary: [3, 5], role: 'guard', eras: ['georgian', 'victorian'] },
  butcher: { n: 'butcher', cls: 'mid', vit: [18, 26], wary: [3, 5], role: 'guard' },
  apprentice: { n: 'apprentice', cls: 'mid', vit: [14, 22], wary: [2, 4] },
  merchant: { n: 'merchant', cls: 'mid', vit: [14, 22], wary: [3, 6], role: 'steward' },
  goldsmith: { n: 'goldsmith', cls: 'mid', vit: [14, 20], wary: [4, 6], role: 'steward' },
  clerk: { n: 'clerk', cls: 'mid', vit: [12, 18], wary: [3, 5], role: 'steward' },
  watchman: { n: 'night watchman', vn: 'constable', cls: 'mid', vit: [16, 24], wary: [4, 7], role: 'guard' },
  scholar: { n: 'scholar', cls: 'mid', vit: [12, 18], wary: [3, 6], role: 'steward' },
  medium: { n: 'spiritualist medium', cls: 'mid', vit: [12, 18], wary: [4, 7], role: 'spy', eras: ['victorian'] },
  priest: { n: 'priest', cls: 'holy', vit: [14, 22], wary: [5, 8], role: 'confessor' },
  nun: { n: 'nun', cls: 'holy', vit: [14, 20], wary: [4, 7], role: 'confessor', eras: ['medieval', 'tudor'] },
  friar: { n: 'friar', cls: 'holy', vit: [16, 22], wary: [4, 6], role: 'confessor', eras: ['medieval', 'tudor'] },
  curate: { n: 'curate', cls: 'holy', vit: [14, 20], wary: [4, 7], role: 'confessor', eras: ['georgian', 'victorian'] },
  lady: { n: 'lady of quality', cls: 'high', vit: [16, 24], wary: [5, 8], role: 'steward' },
  lord: { n: 'young lord', cls: 'high', vit: [18, 26], wary: [5, 8], role: 'steward' },
  courtier: { n: 'courtier', cls: 'high', vit: [14, 22], wary: [5, 7], role: 'spy' },
  knight: { n: 'knight', cls: 'high', vit: [22, 30], wary: [5, 8], role: 'guard', eras: ['medieval', 'tudor'] },
  officer: { n: 'officer of the Guards', cls: 'high', vit: [22, 30], wary: [5, 8], role: 'guard', eras: ['georgian', 'victorian'] },
  dandy: { n: 'dandy', cls: 'high', vit: [14, 20], wary: [3, 5], eras: ['georgian', 'victorian'] },
};

DATA.ROLES = {
  guard: { name: 'Bodyguard', glyph: '⚔', desc: '+8 haven defence against raids.' },
  steward: { name: 'Steward', glyph: '⚖', desc: '+20% income; guards your fortune while you sleep in torpor.' },
  spy: { name: 'Informant', glyph: '👁', desc: 'Hunter threat −3 each night; tracking hunters is easier.' },
  confessor: { name: 'Confessor', glyph: '✝', desc: 'Suspicion fades faster (−2 each night).' },
  physician: { name: 'Physician', glyph: '☤', desc: 'Your wounds mend faster (+8 health each day).' },
};

DATA.NAMES = {
  medieval: { f: ['Agnes', 'Alys', 'Joan', 'Matilda', 'Isabel', 'Cecily', 'Margery', 'Maud', 'Edith', 'Beatrice', 'Rohese', 'Emma', 'Juliana'],
    m: ['John', 'William', 'Thomas', 'Walter', 'Richard', 'Geoffrey', 'Hugh', 'Roger', 'Simon', 'Adam', 'Nicholas', 'Ralph', 'Osbert'] },
  tudor: { f: ['Anne', 'Elizabeth', 'Mary', 'Katherine', 'Jane', 'Margaret', 'Frances', 'Grace', 'Bridget', 'Dorothy', 'Susanna'],
    m: ['Henry', 'Edmund', 'Francis', 'Christopher', 'Robert', 'Humphrey', 'Anthony', 'Nathaniel', 'Ambrose', 'Gilbert', 'Toby'] },
  georgian: { f: ['Charlotte', 'Georgiana', 'Caroline', 'Sophia', 'Amelia', 'Harriet', 'Lydia', 'Hester', 'Arabella', 'Fanny'],
    m: ['George', 'Frederick', 'Horatio', 'Jonathan', 'Samuel', 'Benjamin', 'Josiah', 'Lucius', 'Tobias', 'Jeremiah'] },
  victorian: { f: ['Ada', 'Florence', 'Eliza', 'Victoria', 'Clara', 'Edith', 'Beatrice', 'Violet', 'Lottie', 'Mina', 'Evangeline'],
    m: ['Albert', 'Edward', 'Arthur', 'Alfred', 'Ernest', 'Percival', 'Walter', 'Cecil', 'Ambrose', 'Septimus', 'Jonah'] },
  sur: ['Thorne', 'Cooper', 'Fletcher', 'Ashdown', 'Blackwood', 'Marsh', 'Hale', 'Crane', 'Pryce', 'Webb', 'Dunmore', 'Carrow',
    'Grimsby', 'Whitlock', 'Mercer', 'Tanner', 'Holloway', 'Pike', 'Fairfax', 'Sallow', 'Rook', 'Kettle', 'Moss', 'Lark',
    'Crowther', 'Aldous', 'Penhallow', 'Greaves', 'Winter', 'Quill', 'Ashby', 'Nightingale', 'Scrope', 'Wynn', 'Bellamy'],
};

DATA.TRAITS = ['humming a hymn under their breath', 'reeking of cheap ale', 'clutching a rosary', 'counting coins by lamplight',
  'weeping quietly into their sleeve', 'limping on a bad leg', 'laughing far too loudly', 'glancing over their shoulder',
  'wrapped in a threadbare cloak', 'smelling faintly of lavender', 'with ink-stained fingers', 'singing a bawdy song',
  'coughing wetly', 'in fine but mended clothes', 'whistling a tune you once knew', 'with a knife tucked in their belt',
  'waiting for someone who will not come', 'feeding scraps to a stray dog', 'muttering a lover\'s name', 'flushed with fever',
  'arguing with a shadow', 'carrying a sleeping child', 'staring at the moon'];

DATA.HUNTERS = {
  medieval: ['Brother Anselm of the Black Friars', 'Sir Godric the Penitent', 'Father Wystan, Inquisitor'],
  tudor: ['Witchfinder Matthias Crane', 'Master Tobias Grindal, the Queen\'s Searcher', 'Dr. Simeon Ashby, Astrologer'],
  georgian: ['Dr. Ezekiel Voss, Natural Philosopher', 'Captain Silas Holloway of Bow Street', 'The Reverend Absalom Pike'],
  victorian: ['Inspector Jonah Marsh of Scotland Yard', 'Professor Aldous Wren of Leiden', 'Mrs. Evangeline Stroud, widow'],
};
DATA.PRINCES = {
  medieval: 'Prince Aurelian, Who Sleeps Beneath the Tower',
  tudor: 'Prince Isolde Ravencourt',
  georgian: 'Prince Lucien d\'Aldmoor',
  victorian: 'Prince Mordecai Vane',
};
DATA.RIVALS = ['Lord Valerian Morcant', 'Lady Cressida Nightingale', 'Brother Hollis the Grey', 'Ottoline Vex',
  'Sir Reynard Blackthorn', 'Madame Sabine Delacroix', 'Gideon Crowe', 'The Countess Ysolde Brae'];

/* --- court petitions --------------------------------------- */
DATA.TASKS = [
  { id: 'tribute', title: 'Tribute to the Throne', desc: t => `Deliver £${t.amt} to the Prince's seneschal.`,
    gen: s => ({ amt: Math.round(50 * G.m() * (1 + G.rankIdx() * 0.6)) }), done: (s, t) => s.gold >= t.amt,
    pay: t => ({ gold: -t.amt }), reward: { prestige: 6, essence: 2 } },
  { id: 'holy', title: 'Silence a Meddling Cleric', desc: () => 'A churchman whispers of the undead. Drain a holy vessel dry.',
    gen: () => ({}), counter: 'drain_holy', reward: { prestige: 9, essence: 3 } },
  { id: 'noble', title: 'A Noble Vintage', desc: () => 'The Prince desires that a high-born mortal be drained — for reasons of state.',
    gen: () => ({}), counter: 'drain_high', reward: { prestige: 8, gold: 40 } },
  { id: 'blood', title: 'Blood Offering', desc: () => 'Offer 25 measures of your own vitae at Elysium, in a golden chalice.',
    gen: () => ({}), done: s => s.blood >= 30, pay: () => ({ blood: -25 }), reward: { prestige: 7 } },
  { id: 'inf', title: 'A Hand on the City', desc: t => `Raise your ${t.fname} influence to ${t.need}.`,
    gen: s => { const f = G.pick(['church', 'crown', 'guilds', 'underworld']); return { f, fname: G.fname(f), need: Math.min(90, Math.max(25, Math.round(s.inf[f] + 12))) }; },
    done: (s, t) => s.inf[t.f] >= t.need, reward: { prestige: 8, essence: 2 } },
  { id: 'quiet', title: 'Keep the Masquerade', desc: () => 'Too many rumours. Bring Suspicion below 15.',
    gen: () => ({}), done: s => s.susp < 15, reward: { prestige: 6, gold: 30 } },
  { id: 'hunter', title: 'The Hunter Must Die', desc: () => 'A mortal hunter stalks the Kindred of London. End them.',
    gen: () => ({}), cond: s => !!s.hunter, counter: 'hunter_slain', reward: { prestige: 14, essence: 5 } },
  { id: 'ghoul', title: 'An Eye Within', desc: t => `Bind a mortal servant with the role of ${t.rname}.`,
    gen: () => { const r = G.pick(['spy', 'steward', 'confessor', 'guard']); return { r, rname: DATA.ROLES[r].name }; },
    done: (s, t) => s.circle.some(c => c.alive && c.kind === 'ghoul' && c.role === t.r), reward: { prestige: 7 } },
];

/* --- achievements ------------------------------------------ */
DATA.ACH = [
  { id: 'first', name: 'First Blood', desc: 'Feed for the first time.', test: s => s.feeds >= 1 },
  { id: 'ledger', name: 'The Red Ledger', desc: 'Drain ten mortals dry.', test: s => s.kills >= 10 },
  { id: 'butcher', name: 'The Butcher of London', desc: 'Drain fifty mortals dry.', test: s => s.kills >= 50 },
  { id: 'gentle', name: 'The Gentle Dead', desc: 'Feed thirty times without ever killing.', test: s => s.feeds >= 30 && s.kills === 0 },
  { id: 'saint', name: 'Saint of the Night', desc: 'Reach 90 Humanity.', test: s => s.humanity >= 90 },
  { id: 'bond', name: 'The Blood Bond', desc: 'Command three ghouls at once.', test: s => s.circle.filter(c => c.alive && c.kind === 'ghoul').length >= 3 },
  { id: 'elder', name: 'A Voice at Elysium', desc: 'Be recognised as an Elder.', test: s => s.rank >= 3 },
  { id: 'prince', name: 'Prince of London', desc: 'Take the throne of the night.', test: s => s.rank >= 5 },
  { id: 'rich', name: 'Old Money', desc: 'Hoard £10,000.', test: s => s.gold >= 10000 },
  { id: 'sleeper', name: 'The Long Sleep', desc: 'Spend a century in torpor.', test: s => s.stats.torpor >= 100 },
  { id: 'bane', name: 'Hunter\'s Bane', desc: 'Destroy three hunters.', test: s => s.stats.huntersSlain >= 3 },
  { id: 'maker', name: 'Maker', desc: 'Embrace a childe.', test: s => s.circle.some(c => c.kind === 'childe') },
  { id: 'heart', name: 'Heartbreak', desc: 'Outlive someone you loved.', test: s => s.flags.loverLost },
  { id: 'fire', name: 'Out of the Ashes', desc: 'Survive the Great Fire awake.', test: s => s.flags.fireSurvived },
  { id: 'ripper', name: 'The Autumn of Terror', desc: 'Find the Whitechapel murderer.', test: s => s.flags.ripperFound },
  { id: 'gaslight', name: 'Creature of Gaslight', desc: 'Reach the Victorian age.', test: s => s.year >= 1837 },
  { id: 'potent', name: 'Ancient Blood', desc: 'Reach Blood Potency 6.', test: s => s.potency >= 6 },
  { id: 'estate', name: 'Lord of Blackmoor', desc: 'Claim Blackmoor Hall.', test: s => s.haven >= 4 },
  { id: 'tycoon', name: 'Tycoon of the Dark', desc: 'Own eight holdings.', test: s => Object.keys(s.holdings).length >= 8 },
];

/* --- random events ----------------------------------------- */
// where: 'dusk' (at nightfall), or a list of district ids, or 'any' district.
DATA.EVENTS = [
  { id: 'urchin_sees', title: 'A Witness at the Grave', glyph: '👁', where: 'dusk', weight: 3,
    text: s => `You rise from your resting place and brush the grave-dirt from your clothes. A small, filthy face watches you from the shadows — a child, eyes wide as coins. They saw everything.`,
    choices: [
      { label: 'Command the child to forget', sub: 'Mesmerism', req: s => G.power('mesmerism') >= 1,
        run: s => ({ text: 'Your eyes find theirs, and their pupils swell to black moons. "You saw a cat," you whisper. "Only a cat." The child nods, smiling, and wanders away humming.', d: { essence: 1 } }) },
      { label: 'Press a coin into their palm', sub: '£3 · buy their silence',
        req: s => s.gold >= 3, run: s => ({ text: 'The child snatches the coin and bites it. "Didn\'t see nothing, m\'lord." Children are the most honest liars in London.', d: { gold: -3, susp: 2 } }) },
      { label: 'Silence them. Forever.', sub: 'The Beast approves', cls: 'dark',
        run: s => { G.addVictim({ name: 'a nameless child', occ: 'street urchin' }); return { text: 'It is quick. It is quiet. The blood is thin and sweet and tastes of nothing but hunger. You do not look at the small face afterwards. You will see it anyway — in the dark behind your eyes, for a very long time.', d: { blood: 10, humanity: -8 } }; } },
      { label: 'Let them run', run: s => ({ text: 'The child flees shrieking into the night. By morning, half the parish will have heard of the corpse that climbed out of its grave.', d: { susp: 9 } }) },
    ] },
  { id: 'poacher', title: 'Poacher in the Dark', glyph: '⚔', where: 'any', weight: 2,
    text: s => `Blood on the air. In a narrow alley you find another of the Kindred — lank, ragged, feral — crouched over a still-twitching body. It looks up and bares its fangs. This is your ground.`,
    choices: [
      { label: 'Drive it off by force', sub: 'Might', chance: s => G.chance('might', 5),
        run: (s, ok) => ok ? { text: 'You hit it hard enough to crack stone. It flees over the rooftops, and the kill it leaves behind is still warm.', d: { blood: 15, prestige: 2 } }
          : { text: 'It fights like a starved dog. Claws open your cheek to the bone before it slips away.', d: { health: -20 } } },
      { label: 'Speak to it as a peer', sub: 'Allure', chance: s => G.chance('allure', 4),
        run: (s, ok) => ok ? { text: '"Share," you say, "and tell me what you know." It shares. It knows the watch\'s rounds, and which houses have no dogs.', d: { blood: 8, underworld: 4, essence: 1 } }
          : { text: 'It only hisses and drags the body away into the dark. You are left with the smell.', d: {} } },
      { label: 'Leave it to its meal', run: s => ({ text: 'Not every battle must be fought. But word travels, and some at Elysium will say you are soft.', d: { prestige: -1 } }) },
    ] },
  { id: 'witch_mob', title: 'Torches in the Lane', glyph: '🔥', where: 'any', weight: 2, eras: ['medieval', 'tudor'],
    text: s => `A mob with torches drags a woman through the mud. "Witch!" they howl. "She soured the milk! She cursed the Hendry child!" She is an old herb-woman. She is no witch. You know what real monsters look like.`,
    choices: [
      { label: 'Wade in and save her', sub: 'Might · the mob will remember a face', chance: s => G.chance('might', 5),
        run: (s, ok) => ok ? { text: 'You scatter them like chaff. The old woman stares at your pale face and whispers, "God bless you, whatever you are." It warms something you thought long cold.', d: { humanity: 5, susp: 6 } }
          : { text: 'You save her, but a torch catches your sleeve and a cudgel finds your skull. They will talk of the fiend who fought for the witch.', d: { humanity: 4, health: -18, susp: 10 } } },
      { label: 'Scatter them with a trick of shadow', sub: 'Guile', chance: s => G.chance('guile', 5),
        run: (s, ok) => ok ? { text: 'A scream from the wrong alley, a torch that gutters out, a shape that should not be there — the mob breaks and runs. The old woman limps away free.', d: { humanity: 4 } }
          : { text: 'Your trick convinces them only that the Devil is truly abroad. They hang her faster.', d: { humanity: -1, susp: 4 } } },
      { label: 'Feed on the chaos', sub: 'no one counts the dead after a riot', cls: 'dark',
        run: s => ({ text: 'While they burn her, you take one of the burners — a fat man who laughed loudest — into a doorway. No one notices one more scream tonight.', d: { blood: 22, humanity: -3 } }) },
      { label: 'Walk on', run: s => ({ text: 'The smoke follows you for three streets. You tell yourself it is only smoke.', d: { humanity: -1 } }) },
    ] },
  { id: 'nightmare', title: 'Faces in the Dark', glyph: '☾', where: 'dusk', weight: 2, cond: s => s.kills >= 2,
    text: s => `Your day-sleep was not dreamless. They came to you — ${G.victimNames(3)} — standing silent around your resting place, their throats still open. They did not accuse. They only watched.`,
    choices: [
      { label: 'Pray for them', sub: 'Remember who you were',
        run: s => ({ text: 'The words come haltingly and burn your tongue, but you say them. For each name. The watching faces fade, one by one.', d: { humanity: 3, hours: -1 } }) },
      { label: 'Embrace the Beast', sub: 'They were only meat', cls: 'dark',
        run: s => ({ text: 'You laugh at the dead until they flee. Something inside you grows a little larger, a little hungrier, and a great deal stronger.', d: { humanity: -3, essence: 4 } }) },
    ] },
  { id: 'sire_letter', title: 'A Letter Sealed in Blood', glyph: '✉', where: 'dusk', weight: 1, once: true,
    text: s => `On the lid of your coffin rests a letter, sealed with black wax and a single drop of old blood. The hand is ${G.clan().sire}'s.<br><br><i>“Childe — you have survived longer than I wagered. The first century is the hardest. Feed wisely, trust no one who smiles at Elysium, and never, ever let them see you rise.”</i>`,
    choices: [
      { label: 'Taste the seal', run: s => ({ text: 'The drop of sire-blood on the seal floods your tongue with memories that are not yours: a burning abbey, a ship in a storm, a king\'s deathbed. You understand a little more of what you are.', d: { essence: 5 } }) },
      { label: 'Burn it', run: s => ({ text: 'You owe nothing to the one who made you. The letter curls in the candle-flame, and you feel lighter.', d: { humanity: 1 } }) },
    ] },
  { id: 'priest_suspects', title: 'The Priest Who Knows', glyph: '✝', where: ['stpauls', 'cheapside', 'whitechapel'], weight: 2,
    text: s => `A priest steps from a doorway into your path, holding a crucifix out before him in a trembling hand. "I have watched you," he says. "Three nights now. You cast no shadow on the chapel wall. In God's name — what are you?"`,
    choices: [
      { label: 'Make him forget', sub: 'Mesmerism', req: s => G.power('mesmerism') >= 1,
        run: s => ({ text: 'The crucifix falls from his slack hand. When he wakes on the cobbles, he remembers only a drunkard who stole his purse.', d: { susp: -3 } }) },
      { label: 'Confess the truth', sub: 'Humanity 50+', req: s => s.humanity >= 50,
        run: s => ({ text: 'You tell him. All of it. He weeps, and prays, and does not flee. "Then God help you," he says at last, "for no one else will." He becomes a strange sort of friend.', d: { humanity: 4, church: 6, susp: 2 } }) },
      { label: 'Laugh and walk past', sub: 'Guile', chance: s => G.chance('guile', 5),
        run: (s, ok) => ok ? { text: '"A shadow? Father, have you been at the communion wine?" He flushes and apologises. The doubt you planted will grow.', d: { church: 1 } }
          : { text: 'He does not believe you. He writes a long letter to his bishop.', d: { susp: 10 } } },
      { label: 'Kill him', sub: 'holy blood', cls: 'dark',
        run: s => { G.addVictim({ name: 'a nameless priest', occ: 'priest' }); G.count('drain_holy'); return { text: 'His crucifix scorches your palm as you break his neck. Holy blood is fierce and bright as sunlight in the mouth.', d: { blood: 20, humanity: -6, susp: 8, essence: 3 } }; } },
    ] },
  { id: 'lover_meet', title: 'A Glance Across the Room', glyph: '❦', where: ['westminster', 'southwark'], weight: 2,
    cond: s => !s.circle.some(c => c.alive && c.kind === 'lover'),
    text: s => { s._lover = G.genPerson(); return `Among the dancers you notice ${s._lover.name} — a ${s._lover.age}-year-old with laughing eyes, who looks at you not with fear or desire, but with <i>curiosity</i>. No one has looked at you like that in a long time.`; },
    choices: [
      { label: 'Court them', sub: 'Allure', chance: s => G.chance('allure', 4),
        run: (s, ok) => { if (ok) { G.addLover(s._lover); return { text: `You talk until the candles gutter. ${s._lover.name} asks to see you again. You agree before you can think better of it. It is the most dangerous thing you have done in years.`, d: { humanity: 4 } }; }
          return { text: 'Your words come out cold and strange. They excuse themselves politely. The moment passes, and you are a corpse again.', d: {} }; } },
      { label: 'Feed on them instead', cls: 'dark',
        run: s => ({ text: 'You take them into the garden, and they come willingly — and you drink, and you leave them pale and dizzy on a stone bench, wondering what they had hoped for.', d: { blood: 18, humanity: -1 } }) },
      { label: 'Look away', run: s => ({ text: 'Love is for the living. You leave early.', d: {} }) },
    ] },
  { id: 'duel', title: 'An Insult at Cards', glyph: '⚔', where: ['westminster', 'southwark'], weight: 1,
    text: s => `A red-faced young gallant, far in his cups, accuses you of cheating at cards. "Name your second, sirrah! We meet at dawn on the heath!" The room falls silent. Dawn. Of course.`,
    choices: [
      { label: 'Accept — but insist on midnight', sub: 'Might', chance: s => G.chance('might', 3),
        run: (s, ok) => ok ? { text: 'By lantern-light on the heath, you disarm him with contemptuous ease and let him live. The story goes round every club in town.', d: { crown: 6, prestige: 2, hours: -2 } }
          : { text: 'He is better than he looked. His blade opens your side — and the wound does not bleed as a mortal\'s should. His second crosses himself.', d: { health: -15, susp: 7, hours: -2 } } },
      { label: 'Humiliate him with words', sub: 'Guile', chance: s => G.chance('guile', 4),
        run: (s, ok) => ok ? { text: 'By the time you finish, the whole room is laughing at him. He slinks away. Useful friends buy you a drink you pretend to sip.', d: { crown: 4 } }
          : { text: 'Your tongue is less sharp than your fangs. You leave to jeers.', d: { crown: -3 } } },
      { label: 'Drink from him later', cls: 'dark', run: s => ({ text: 'You follow him home. He wakes at noon, weak as a kitten, remembering nothing but a nightmare of teeth.', d: { blood: 16, hours: -1 } }) },
    ] },
  { id: 'rival_scheme', title: 'Knives at Elysium', glyph: '♠', where: 'dusk', weight: 2, cond: s => s.rival && s.turn > 4,
    text: s => `Word comes by a crow with a ribbon on its leg: ${s.rival.name} has been whispering to the Prince that you are careless — that your feeding endangers the Masquerade of all London.`,
    choices: [
      { label: 'Counter the rumours', sub: 'Allure', chance: s => G.chance('allure', 5),
        run: (s, ok) => ok ? { text: 'You arrive at Elysium early, charming and contrite. By midnight it is your rival who looks petty.', d: { prestige: 2, hours: -1 } } : { text: 'Your denials only make the rumours louder.', d: { prestige: -4, hours: -1 } } },
      { label: 'Let your informants handle it', sub: 'Underworld 30+', req: s => s.inf.underworld >= 30,
        run: s => { s.rival.standing -= 8; return { text: 'Your people in the gutters have long memories. By dawn, three of your rival\'s own servants are spreading worse tales about their master.', d: { underworld: -3 } }; } },
      { label: 'Ignore it', run: s => ({ text: 'Let them talk. But at Elysium, silence is a confession.', d: { prestige: -3 } }) },
    ] },
  { id: 'elder_torpor', title: 'The Sleeper Beneath', glyph: '⚱', where: ['graveyard'], weight: 1, once: true,
    text: s => `Your fingers find a seam in the old stone. Beneath, in a lead-lined coffin, lies a withered thing — one of the Ancients, sunk in torpor since before the Conqueror came. Its heart still beats. Once a century.`,
    choices: [
      { label: 'Drink its soul (Diablerie)', sub: 'Blood Potency +1 · a terrible crime', cls: 'dark',
        run: s => { s.potencyBonus++; G.recalcPotency(); return { text: 'You drink. And drink. And its thousand years pour into you — languages, battles, the taste of Roman wine — and then its screaming soul, and then silence. You are more than you were. You are less, too.', d: { humanity: -12, essence: 10, prestige: -5 } }; } },
      { label: 'Wake it with your blood', sub: 'Blood −25',
        req: s => s.blood >= 25, run: s => { G.giveItem('vitae'); G.giveItem('golconda'); return { text: 'Its eyes open like two wet coins. It speaks in a tongue older than English, then in yours. "Thank you, little one." It gives you a vial of its blood and a leaf of vellum, and walks into the fog, and is gone.', d: { blood: -25, essence: 6, humanity: 2 } }; } },
      { label: 'Seal the tomb again', run: s => ({ text: 'Some doors are best left closed. You roll the stone back into place and walk away quickly.', d: { humanity: 1 } }) },
    ] },
  { id: 'fledgling', title: 'An Abandoned Fledgling', glyph: '✧', where: 'any', weight: 1, cond: s => s.potency >= 2,
    text: s => `A newly-made vampire huddles in a doorway, sobbing blood. Their sire Embraced them and left them to the sun. "Please," they say. "I don't know what I am. I killed my brother. I didn't mean to."`,
    choices: [
      { label: 'Take them in as your childe', sub: 'Humanity +, but the Prince may object',
        run: s => { const p = G.genPerson(); G.addCircle({ kind: 'childe', name: p.name, age: p.age, desc: 'An orphan fledgling you took in. Defends your haven and hunts for you.' }); return { text: `${p.name} clings to you like a drowning thing. You teach them to hunt without killing, and to hide from the dawn. They will not forget it.`, d: { humanity: 3, prestige: -2 } }; } },
      { label: 'Deliver them to the Prince', run: s => ({ text: 'Unsanctioned Embraces are a crime. The Prince thanks you for your diligence. You do not ask what became of the fledgling.', d: { prestige: 5, humanity: -2 } }) },
      { label: 'End their suffering', cls: 'dark', run: s => ({ text: 'You make it quick. Their blood is thin and bitter and full of their brother\'s blood too.', d: { blood: 12, humanity: -4, essence: 3 } }) },
    ] },
  { id: 'prince_summons', title: 'Summoned to Elysium', glyph: '♛', where: 'dusk', weight: 2, cond: s => s.rank < 5,
    text: s => `A pale page in the Prince's livery waits at your door with a candle that burns black. ${s.princeName} requires your presence at Elysium. Tonight.`,
    choices: [
      { label: 'Attend with proper humility', sub: '2 hours',
        run: s => ({ text: 'You kneel, you kiss the offered ring, you listen to an hour of veiled threats about the Masquerade. The Prince seems... satisfied.', d: { hours: -2, prestige: 4 } }) },
      { label: 'Send an excuse and a gift', sub: '£20', req: s => s.gold >= Math.round(20 * G.m()),
        run: s => ({ text: 'A fine gift and a finer excuse. The Prince is not pleased, but is not insulted either.', d: { gold: -Math.round(20 * G.m()), prestige: 1 } }) },
      { label: 'Ignore the summons', run: s => ({ text: 'The page waits until nearly midnight, then leaves. The black candle is left burning on your step. It is a warning.', d: { prestige: -6 } }) },
    ] },
  { id: 'reflection', title: 'A Moment of Stillness', glyph: '❧', where: 'dusk', weight: 2,
    text: s => `For a moment, between the bells, the hunger is quiet. You remember ${G.origin().memory}. You remember being warm.`,
    choices: [
      { label: 'Hold the memory close', run: s => ({ text: 'You sit very still until the memory fades, like the last warmth leaving a hearthstone. You are still, somewhere in here, a person.', d: { humanity: 2, hours: -1 } }) },
      { label: 'Let it go', run: s => ({ text: 'Warmth is a mortal luxury. You rise and go out hunting.', d: { essence: 1 } }) },
    ] },
  { id: 'sick_child', title: 'The Mother\'s Plea', glyph: '☤', where: ['whitechapel', 'southwark', 'docks'], weight: 2,
    text: s => `A woman grabs your sleeve, taking you for a physician in your dark coat. "Please, sir — my little one burns with fever and the barber says she'll not see morning." Your blood could heal the child. It could also bind her to you forever.`,
    choices: [
      { label: 'Heal the child with a drop of vitae', sub: 'Blood −8',
        req: s => s.blood >= 10, run: s => ({ text: 'One drop on the cracked lips. By dawn, the fever breaks. The mother kisses your cold hands and does not notice that they are cold. You feel, absurdly, like crying.', d: { blood: -8, humanity: 5, herd: 1 } }) },
      { label: 'Pay for a real physician', sub: '£8', req: s => s.gold >= 8,
        run: s => ({ text: 'You press coins on her and leave before she can thank you. You never learn if it was enough.', d: { gold: -8, humanity: 2 } }) },
      { label: 'Pull free and walk on', run: s => ({ text: 'Children die every night in London. It is not your concern. It should not be.', d: { humanity: -1 } }) },
    ] },
  { id: 'body_found', title: 'The Body in the River', glyph: '⚰', where: 'dusk', weight: 3, cond: s => s.flags.recentKill,
    text: s => `The watch has pulled a corpse from the river — bloodless, white as tallow, with two neat wounds on the throat. The whole parish is talking. You recognise the face. You put it there.`,
    choices: [
      { label: 'Bribe the coroner', sub: '£15', req: s => s.gold >= Math.round(15 * G.m()),
        run: s => ({ text: '"Death by drowning," writes the coroner, pocketing your purse. The wounds? Eels, he supposes.', d: { gold: -Math.round(15 * G.m()), susp: -4 } }) },
      { label: 'Spread a better rumour', sub: 'Guile', chance: s => G.chance('guile', 5),
        run: (s, ok) => ok ? { text: 'By nightfall, everyone knows it was the jealous husband. Poor man. They hang him within the week.', d: { susp: -2, humanity: -2 } } : { text: 'Nobody believes you. The talk turns to the old stories — of the dead who walk.', d: { susp: 8 } } },
      { label: 'Say nothing, do nothing', run: s => ({ text: 'Rumours fester in silence.', d: { susp: 7 } }) },
    ] },
  { id: 'hunter_note', title: 'Nailed to Your Door', glyph: '✠', where: 'dusk', weight: 3, cond: s => s.hunter && s.hunter.threat > 35,
    text: s => `A sheet of paper has been nailed to the door of your haven with an iron nail, and a sprig of hawthorn. In a tight, pious hand: <i>“I know what thou art. — ${s.hunter.name}.”</i>`,
    choices: [
      { label: 'Move your coffin to another room', sub: '2 hours', run: s => { s.hunter.threat = Math.max(0, s.hunter.threat - 15); return { text: 'You spend two hours dragging your resting place deeper into the dark. Let them search.', d: { hours: -2 } }; } },
      { label: 'Leave a note of your own', sub: 'Might', chance: s => G.chance('might', 4),
        run: (s, ok) => { if (ok) { s.hunter.threat = Math.max(0, s.hunter.threat - 20); return { text: 'You leave the hunter\'s own dog on their doorstep — unharmed, sleeping, with a note tucked in its collar: <i>I know where thou sleepest too.</i> They hesitate.', d: {} }; } s.hunter.threat += 10; return { text: 'Your threat only hardens their resolve.', d: {} }; } },
      { label: 'Do nothing', run: s => { s.hunter.threat += 8; return { text: 'You tear the paper down. The hawthorn leaves a scratch that burns all night.', d: { health: -3 } }; } },
    ] },
  { id: 'seance', title: 'The Séance', glyph: '☽', where: ['westminster', 'graveyard'], weight: 2, eras: ['victorian'],
    text: s => `A fashionable séance in a darkened parlour. The medium, a gaunt woman in black crêpe, rolls back her eyes — then opens them and looks straight at you. "There is a dead thing in this room," she says, "and it is not a spirit."`,
    choices: [
      { label: 'Play along and speak as a spirit', sub: 'Guile', chance: s => G.chance('guile', 5),
        run: (s, ok) => ok ? { text: 'You moan, you rap the table, you deliver a message from a dead uncle. The guests are thrilled and the medium goes white. She will be your creature now.', d: { crown: 5, underworld: 3 } } : { text: 'Your spirit-voice is laughable. Worse, the medium is not fooled. She will talk.', d: { susp: 6 } } },
      { label: 'Visit her afterwards', cls: 'dark', run: s => ({ text: 'You find her alone among her candles. She is not afraid. "I have waited all my life to meet one of you," she says, and bares her throat.', d: { blood: 18, essence: 3 } }) },
      { label: 'Leave at once', run: s => ({ text: 'You slip out before the lamps are lit. Behind you, someone screams.', d: { susp: 2 } }) },
    ] },
  { id: 'fog', title: 'A London Particular', glyph: '☁', where: 'dusk', weight: 2, eras: ['georgian', 'victorian'],
    text: s => `A great yellow fog has rolled up from the river — a true pea-souper, thick enough to lose your own hand in. Lamplighters give up. Carriages crawl. The city is blind tonight.`,
    choices: [{ label: 'Perfect hunting weather', run: s => { s.flags.fog = true; return { text: 'Tonight, every hunt is easier and every witness is blind. (+15% to hunting; less suspicion.)', d: {} }; } }] },
  { id: 'resurrection', title: 'The Resurrection Men', glyph: '⚒', where: ['graveyard'], weight: 2, eras: ['georgian', 'victorian'],
    text: s => `Two body-snatchers are digging up a fresh grave by shuttered lantern, to sell the corpse to the anatomists. One of them looks up and sees you watching from atop a tomb.`,
    choices: [
      { label: 'Recruit them', sub: 'They know the dead, and the dark',
        run: s => { const p = G.genPerson(); G.addCircle({ kind: 'ghoul', role: 'guard', name: p.name, age: p.age, occ: 'resurrection man', loyalty: 60 }); return { text: `${p.name} is not afraid of corpses — even ones that talk. A few drops of your blood seal the bargain.`, d: { blood: -6 } }; },
        req: s => G.ghoulRoom() },
      { label: 'Feed on them', cls: 'dark', run: s => ({ text: 'Who will investigate the disappearance of grave-robbers? You take both. The second tried to pray.', d: { blood: 30, humanity: -4, essence: 2 } }) },
      { label: 'Frighten them off', run: s => ({ text: 'You rise from the tomb with your arms spread. They drop their spades and flee screaming. The dead sleep a little safer.', d: { humanity: 1 } }) },
    ] },
  { id: 'alchemist', title: 'The Alchemist\'s Offer', glyph: '☀', where: ['cheapside', 'docks'], weight: 1, eras: ['tudor', 'georgian'],
    text: s => `A wild-bearded alchemist sidles up with a pot of grey ointment. "For your... condition, good sir. Distilled from salamander and ground pearl. Smear it thick and walk beneath the sun itself!" He wants £${Math.round(12 * G.m())}.`,
    choices: [
      { label: 'Buy the salve', sub: `£`, req: s => s.gold >= Math.round(12 * G.m()),
        run: s => { if (G.roll(0.5)) { G.giveItem('salve'); return { text: 'Against all reason, it stinks of genuine sorcery. You pocket it.', d: { gold: -Math.round(12 * G.m()) } }; } return { text: 'It is goose-fat and chalk. The alchemist is already gone.', d: { gold: -Math.round(12 * G.m()) } }; } },
      { label: 'Drink the alchemist instead', cls: 'dark', run: s => ({ text: 'His blood tastes of mercury and sulphur. You feel oddly clever afterwards.', d: { blood: 14, essence: 2, humanity: -1 } }) },
      { label: 'Decline', run: s => ({ text: '"Your loss!" he calls after you.', d: {} }) },
    ] },
  { id: 'brawl', title: 'Blood on the Tavern Floor', glyph: '🗡', where: ['southwark', 'docks'], weight: 2,
    text: s => `A knife-fight breaks out in the tavern. A sailor goes down with his throat cut and the room is suddenly full of the smell. Your fangs slide out before you can stop them.`,
    choices: [
      { label: 'Master the Beast', sub: 'Humanity & Lore', chance: s => Math.min(0.95, 0.3 + s.humanity / 150 + G.attr('lore') * 0.04),
        run: (s, ok) => ok ? { text: 'You grip the table until the oak splinters, and you walk out into the cold air. You held. This time.', d: { humanity: 1 } }
          : { text: 'Red. Only red. When you come back to yourself you are in the alley, and you are not alone, and the other one is not breathing.', d: { blood: 30, humanity: -6, susp: 10 } } },
      { label: 'Lap at the spilled blood', cls: 'dark', run: s => ({ text: 'In the chaos, on your knees, like a dog. It is enough.', d: { blood: 12, humanity: -1, susp: 3 } }) },
    ] },
  { id: 'thief_haven', title: 'A Thief in the Haven', glyph: '🗝', where: 'dusk', weight: 1, cond: s => s.gold > 40,
    text: s => `You wake to the sound of someone rifling through your strongbox. A young thief, face smeared with soot, freezes as your coffin lid slides open.`,
    choices: [
      { label: 'Bind them to your service', sub: 'A ghoul who knows locks', req: s => G.ghoulRoom(),
        run: s => { const p = G.genPerson(); G.addCircle({ kind: 'ghoul', role: 'spy', name: p.name, age: p.age, occ: 'thief', loyalty: 50 }); return { text: `"Drink," you say, opening your wrist. ${p.name} drinks. They are yours now.`, d: { blood: -6 } }; } },
      { label: 'Feed and let them go', run: s => ({ text: 'You drink just enough to leave them dazed on the street at dawn with a very strange story nobody believes.', d: { blood: 12, susp: 3 } }) },
      { label: 'Kill them', cls: 'dark', run: s => { G.addVictim({ name: 'a nameless thief', occ: 'thief' }); return { text: 'They came into the wolf\'s den.', d: { blood: 20, humanity: -4 } }; } },
    ] },
  { id: 'poet', title: 'The Poet Who Wishes to Die', glyph: '✒', where: ['westminster', 'southwark', 'graveyard'], weight: 1, eras: ['georgian', 'victorian'],
    text: s => `A consumptive young poet with fever-bright eyes follows you out of the salon. "I know what you are," he says. "I've read Polidori. Make me like you. I want to write for a thousand years."`,
    choices: [
      { label: 'Grant his wish', sub: 'Embrace a childe · Blood −30', req: s => s.blood >= 30,
        run: s => { const p = G.genPerson('m'); G.addCircle({ kind: 'childe', name: p.name, age: p.age, desc: 'A Romantic poet you Embraced. Writes terrible verse about you.' }); return { text: `${p.name} dies in your arms and wakes screaming, then laughing. Later he writes an ode to you in blood. It is dreadful.`, d: { blood: -30, humanity: -3, prestige: -2 } }; } },
      { label: 'Refuse him gently', run: s => ({ text: '"Immortality is not a longer life," you tell him. "It is a longer death." He does not understand. He will be dead of consumption by spring.', d: { humanity: 2 } }) },
      { label: 'Drink the fever from him', cls: 'dark', run: s => ({ text: 'Tubercular blood tastes of roses and iron and ending.', d: { blood: 15, humanity: -2 } }) },
    ] },
  { id: 'procession', title: 'The Holy Procession', glyph: '✝', where: ['stpauls', 'cheapside'], weight: 1, eras: ['medieval', 'tudor'],
    text: s => `Chanting monks bear a reliquary through the street by candlelight — a saint's bones in gold. As it passes, your skin begins to smoke.`,
    choices: [
      { label: 'Endure it, head bowed', sub: 'Might', chance: s => G.chance('might', 5),
        run: (s, ok) => ok ? { text: 'You stand among the kneeling faithful, burning quietly inside, until it has passed. No one noticed.', d: { health: -5 } } : { text: 'You cry out and stagger. Faces turn. You flee with your coat smouldering.', d: { health: -15, susp: 6 } } },
      { label: 'Duck into an alley', sub: '1 hour', run: s => ({ text: 'You wait out the procession among the rats.', d: { hours: -1 } }) },
    ] },
];

/* --- the history of London --------------------------------- */
DATA.HISTORY = [
  { id: 'plague', year: 1348, month: 9, title: 'The Great Mortality', glyph: '☠',
    text: 'It came up the river on a Gascon ship. First the sailors, then the dockers, then the whole city. Black swellings, coughing blood, carts heaped with bodies. Priests die faster than they can shrive. <br><br>A third of London will die. The living have no time to wonder where a few more went.',
    apply: s => { s.flags.plagueUntil = 1350; },
    sleep: 'The Black Death swept London; one in three souls perished.',
    choices: [
      { label: 'Gorge on the dying', sub: 'Plague cannot touch the dead', run: s => ({ text: 'You move from bed to bed like a physician, and drink from those already lost. Their blood is thin and fevered, but there is so very much of it.', d: { blood: 40, humanity: -2, essence: 3 } }) },
      { label: 'Ease their passing', sub: 'Blood −15 · a gentler mercy', run: s => ({ text: 'You sit with the dying and let them drink from your wrist, and the pain leaves them. Some even recover. A friar calls you an angel of mercy.', d: { blood: -15, humanity: 7, church: 6 } }) },
      { label: 'Hunt freely in the chaos', run: s => ({ text: 'While the watch digs pits, the streets are yours. For two years, suspicion will be fleeting.', d: { susp: -25, blood: 15 } }) },
    ] },
  { id: 'revolt', year: 1381, month: 5, title: 'The Peasants\' Revolt', glyph: '⚒',
    text: 'Wat Tyler\'s rebels pour over London Bridge with scythes and pitchforks. The Savoy Palace burns. The Archbishop\'s head is on a pike. For three days, the old order trembles.',
    sleep: 'The peasants rose under Wat Tyler and burned the Savoy.',
    choices: [
      { label: 'March with the rebels', run: s => ({ text: '"When Adam delved and Eve span, who was then the gentleman?" You carry a torch for them. The poor will remember.', d: { underworld: 12, crown: -8, humanity: 2 } }) },
      { label: 'Defend the Tower', sub: 'Might', chance: s => G.chance('might', 5), run: (s, ok) => ok ? { text: 'You fight in the dark on the Tower walls. A grateful lord remembers the pale knight who held the postern.', d: { crown: 12, prestige: 4 } } : { text: 'The mob overruns your position. You escape, burned and battered.', d: { health: -25, crown: 4 } } },
      { label: 'Feast in the chaos', cls: 'dark', run: s => ({ text: 'Who counts corpses during a revolution?', d: { blood: 35, humanity: -3, essence: 2 } }) },
    ] },
  { id: 'roses', year: 1455, month: 4, title: 'The Wars of the Roses', glyph: '✿',
    text: 'York and Lancaster go to war over the crown. The Kindred of London, too, are choosing roses — and the Prince has made it clear that neutrality will not be forgotten.',
    sleep: 'York and Lancaster tore England apart for thirty years.',
    choices: [
      { label: 'Wear the White Rose of York', run: s => { s.flags.york = true; return { text: 'You lend your gold and your knives to York.', d: { crown: 6 } }; } },
      { label: 'Wear the Red Rose of Lancaster', run: s => { s.flags.lancaster = true; return { text: 'You back Lancaster — a long wager.', d: { crown: 3 } }; } },
      { label: 'Profit from both', sub: 'Guilds', run: s => ({ text: 'Armies need grain, horses and loans. You sell to both sides.', d: { guilds: 8, gold: 80 } }) },
    ] },
  { id: 'bosworth', year: 1485, month: 7, title: 'Bosworth Field', glyph: '♛',
    text: 'King Richard lies dead in a Leicestershire field. Henry Tudor — a Lancastrian — takes the crown. A new dynasty. A new age.',
    sleep: 'Henry Tudor won the crown at Bosworth.',
    choices: [{ label: 'Consider your wagers', run: s => {
      if (s.flags.lancaster) return { text: 'Your long wager pays out. Tudor gratitude flows to those who backed the Red Rose.', d: { crown: 18, gold: 150, prestige: 5 } };
      if (s.flags.york) return { text: 'The Tudors purge Yorkists. Some of the searchers find their way to your door.', d: { crown: -10, susp: 12 } };
      return { text: 'You backed no one, and no one remembers you.', d: {} };
    } }] },
  { id: 'dissolution', year: 1536, month: 3, title: 'The Dissolution of the Monasteries', glyph: '⛪',
    text: 'King Henry has broken with Rome. His commissioners strip the abbeys of gold and lead; monks are turned into the road. The Church\'s power in London is shattered.',
    apply: s => { s.inf.church = Math.round(s.inf.church / 2); },
    sleep: 'Henry VIII dissolved the monasteries; the Church\'s power was halved.',
    choices: [
      { label: 'Buy up the abbey lands', sub: '£200', req: s => s.gold >= 200, run: s => { s.holdings.mill = s.holdings.mill || 1; return { text: 'Old abbey lands, a mill and rents for a song. The monks curse you as they leave.', d: { gold: -200, guilds: 10, humanity: -1 } }; } },
      { label: 'Loot the reliquaries', cls: 'dark', run: s => { G.giveItem('bone'); return { text: 'In the confusion you walk out with a golden reliquary and a saint\'s knucklebone that burns your fingers.', d: { gold: 90, humanity: -2 } }; } },
      { label: 'Shelter the evicted monks', run: s => ({ text: 'You house a dozen brothers in your cellars. They never ask why they never see you by day.', d: { humanity: 4, church: 10, herd: 2 } }) },
    ] },
  { id: 'gunpowder', year: 1605, month: 10, title: 'Remember, Remember', glyph: '💥',
    text: 'On a hunt beneath Westminster you smell it: thirty-six barrels of gunpowder in a cellar under the House of Lords, and a tall man called Fawkes guarding them.',
    sleep: 'A plot to blow up Parliament was foiled on the Fifth of November.',
    choices: [
      { label: 'Tip off the King\'s men', run: s => ({ text: 'An anonymous letter. The plot is foiled. Someone in Whitehall knows it was you, and is grateful.', d: { crown: 14, prestige: 3 } }) },
      { label: 'Sell the secret to the plotters\' enemies', run: s => ({ text: 'Information is the purest currency.', d: { gold: 120, underworld: 8 } }) },
      { label: 'Drink the guard', cls: 'dark', run: s => ({ text: 'You leave him alive but slow. When the searchers come, he barely resists.', d: { blood: 18, crown: 6 } }) },
    ] },
  { id: 'witchfinders', year: 1645, month: 4, title: 'The Witchfinder Years', glyph: '✠',
    text: 'The civil war has loosed a plague of zealots. Witchfinders roam the land, hanging old women by the hundred. And one of them has come to London — asking about pale folk who walk only by night.',
    apply: s => { if (!s.hunter) G.spawnHunter('Witchfinder Matthias Crane'); s.hunter.threat += 25; },
    sleep: 'Witchfinders hanged hundreds during the Civil War.',
    choices: [
      { label: 'Go to ground', run: s => ({ text: 'You stop hunting near your haven and feed only on the road.', d: { susp: -15, blood: -10 } }) },
      { label: 'Turn his accusers on him', sub: 'Guile', chance: s => G.chance('guile', 6), run: (s, ok) => { if (ok) { s.hunter.progress = 100; s.hunter.known = true; return { text: 'A whisper here, a forged letter there. Now the witchfinder\'s own friends name him. And you know where he sleeps.', d: {} }; } return { text: 'He is too careful for your tricks.', d: { susp: 5 } }; } },
    ] },
  { id: 'greatplague', year: 1665, month: 5, title: 'The Great Plague', glyph: '☠',
    text: 'The pestilence returns. Red crosses on the doors, "Lord have mercy upon us" chalked beneath. Dead-carts rumble every night: <i>Bring out your dead!</i>',
    apply: s => { s.flags.plagueUntil = 1666; },
    sleep: 'The Great Plague killed a hundred thousand Londoners.',
    choices: [
      { label: 'Ride the dead-carts', run: s => ({ text: 'Not all of them are dead yet when they are collected. You finish the work.', d: { blood: 35, humanity: -2 } }) },
      { label: 'Nurse a shut-up household', run: s => ({ text: 'You tend a family locked in by the watch. Three of five live.', d: { humanity: 6, herd: 1, blood: -10 } }) },
    ] },
  { id: 'greatfire', year: 1666, month: 8, title: 'The Great Fire of London', glyph: '🔥',
    text: 'A baker\'s oven in Pudding Lane. A dry east wind. By dawn, the fire is a wall of flame a mile long, and it is coming for your haven. Fire — the one thing besides the sun that truly kills your kind.',
    sleep: 'The Great Fire destroyed the medieval City.',
    choices: [
      { label: 'Stand and save your haven', sub: 'Might · dangerous', chance: s => G.chance('might', 6),
        run: (s, ok) => { s.flags.fireSurvived = true; return ok ? { text: 'You tear down the neighbouring houses with your bare hands to make a firebreak. Your haven stands, blackened, in a sea of ash.', d: { health: -20, prestige: 3 } } : { text: 'The flames take your sleeve, your hair, your face. You flee, burning, as your haven collapses.', d: { health: -45, havenLoss: 1 } }; } },
      { label: 'Flee with your coffin', run: s => { s.flags.fireSurvived = true; return { text: 'You drag your coffin to the river and float across to Southwark with the refugees, watching St Paul\'s burn like a torch.', d: { havenLoss: 1 } }; } },
      { label: 'Burn the hunters\' records', sub: 'Guile', chance: s => G.chance('guile', 4), run: (s, ok) => { s.flags.fireSurvived = true; if (ok) { s.hunter = null; return { text: 'In the chaos you break into Guildhall and let the fire have the parish records, the witchfinder\'s journals, every trace of you.', d: { susp: -40 } }; } return { text: 'You find nothing, and nearly die trying.', d: { health: -25 } }; } },
    ] },
  { id: 'southsea', year: 1720, month: 7, title: 'The South Sea Bubble', glyph: '📜',
    text: 'All London has gone mad for South Sea Company stock. Duchesses and footmen alike are mortgaging everything. The price has risen tenfold since January.',
    sleep: 'The South Sea Bubble burst, ruining thousands.',
    choices: [
      { label: 'Buy in with half your fortune', run: s => ({ text: 'By September the bubble bursts. Stock worth £1,000 fetches £150. You should have known better — you have seen tulips, and saints\' bones, and kings.', d: { gold: -Math.round(s.gold * 0.4) } }) },
      { label: 'Sell short to the frenzied', sub: 'Guile', chance: s => G.chance('guile', 6), run: (s, ok) => ok ? { text: 'You bet against madness, and madness pays.', d: { gold: Math.round(s.gold * 0.6), guilds: 8 } } : { text: 'You were right too early. It costs you.', d: { gold: -Math.round(s.gold * 0.15) } } },
      { label: 'Keep your gold in the ground', run: s => ({ text: 'You have learned that the dead should not gamble.', d: {} }) },
    ] },
  { id: 'gin', year: 1736, month: 0, title: 'Mother\'s Ruin', glyph: '🍶',
    text: 'Gin is cheaper than bread. Drunk for a penny, dead drunk for tuppence. The poor of London are drowning in it, and every alley has its insensible body.',
    apply: s => { s.flags.ginUntil = 1751; },
    sleep: 'The Gin Craze ravaged London\'s poor.',
    choices: [
      { label: 'Feast on gin-soaked blood', run: s => ({ text: 'You wake giddy and laughing. Drunkards make easy prey for fifteen years — though the blood is poor.', d: { blood: 20, hours: -1 } }) },
      { label: 'Found a temperance mission', sub: '£60', req: s => s.gold >= 60, run: s => ({ text: 'A small light in a dark decade.', d: { gold: -60, humanity: 5, church: 5 } }) },
    ] },
  { id: 'gordon', year: 1780, month: 5, title: 'The Gordon Riots', glyph: '🔥',
    text: '"No Popery!" Sixty thousand march on Parliament. Then the mob turns: Newgate Prison is stormed and burned, its prisoners loosed into the streets. London belongs to the mob for a week.',
    sleep: 'The Gordon Riots burned Newgate Prison.',
    choices: [
      { label: 'Hunt the escaped convicts', run: s => ({ text: 'Murderers and thieves flee into the dark. Some of them flee into you.', d: { blood: 30, humanity: -1 } }) },
      { label: 'Protect the Catholic chapels', sub: 'Might', chance: s => G.chance('might', 5), run: (s, ok) => ok ? { text: 'The Sardinian chapel stands because you stood in its doorway.', d: { church: 10, humanity: 3 } } : { text: 'You are driven off by sheer numbers.', d: { health: -20 } } },
      { label: 'Loot the burning houses', cls: 'dark', run: s => ({ text: 'Everyone else is.', d: { gold: 150, underworld: 6, humanity: -2 } }) },
    ] },
  { id: 'gaslight', year: 1807, month: 5, title: 'The Coming of Gaslight', glyph: '💡',
    text: 'On Pall Mall, a strange new light: gas lamps, burning white and steady all night long. They say soon every street will have them. The shadows that sheltered you for four centuries are dying.',
    apply: s => { s.flags.gas = true; },
    sleep: 'Gaslight spread through London\'s streets (+20% Suspicion from feeding).',
    choices: [
      { label: 'Mourn the dark', run: s => ({ text: 'You walk Pall Mall until dawn, hating every lamp. (Feeding draws 20% more suspicion from now on.)', d: { humanity: 1 } }) },
      { label: 'Sabotage the gasworks', sub: 'Guile', chance: s => G.chance('guile', 5), run: (s, ok) => ok ? { text: 'A few explosions, a few years\' delay. Progress will not be stopped, but it can be slowed.', d: { underworld: 6, susp: -10 } } : { text: 'The explosion is larger than intended. The papers speak of nothing else.', d: { susp: 12, humanity: -2 } } },
    ] },
  { id: 'vampyre', year: 1819, month: 3, title: '“The Vampyre”', glyph: '✒',
    text: 'A sensational tale is on every lip: <i>The Vampyre</i>, by Dr. Polidori — Lord Byron\'s physician. A pale, seductive aristocrat who drinks the blood of innocents. Fashionable London is enraptured. And terrified.',
    sleep: 'Polidori published “The Vampyre”; the undead became fashionable.',
    choices: [
      { label: 'Embrace the fashion', run: s => { s.flags.byronic = true; return { text: 'Pale is fashionable. Brooding is fashionable. You have never been so fashionable. (Seduction is easier from now on.)', d: { crown: 6 } }; } },
      { label: 'Buy up every copy', sub: '£80', req: s => s.gold >= 80, run: s => ({ text: 'You burn five hundred copies. There are always more.', d: { gold: -80, susp: -5 } }) },
      { label: 'Laugh', run: s => ({ text: 'He got almost everything wrong.', d: { essence: 1 } }) },
    ] },
  { id: 'police', year: 1829, month: 8, title: 'The Peelers', glyph: '⚔',
    text: 'Sir Robert Peel\'s Metropolitan Police take to the streets in blue coats and top hats — professional, organised and everywhere. The old bribable watchmen are gone.',
    apply: s => { s.flags.police = true; },
    sleep: 'The Metropolitan Police were founded (hunters grow more dangerous).',
    choices: [
      { label: 'Corrupt a sergeant early', sub: '£100', req: s => s.gold >= 100 && G.ghoulRoom(),
        run: s => { const p = G.genPerson('m'); G.addCircle({ kind: 'ghoul', role: 'spy', name: 'Sgt. ' + p.name, age: p.age, occ: 'police sergeant', loyalty: 70 }); return { text: 'Sergeant ' + p.name + ' develops a taste for your blood and your money.', d: { gold: -100 } }; } },
      { label: 'Adapt', run: s => ({ text: 'You learn their beats and their shift-changes. (Hunters grow faster from now on.)', d: { essence: 2 } }) },
    ] },
  { id: 'stink', year: 1858, month: 6, title: 'The Great Stink', glyph: '☣',
    text: 'A hot summer and the Thames — an open sewer for three million souls — ferments. Parliament hangs lime-soaked curtains. Even you can barely stand the smell.',
    sleep: 'The Great Stink forced London to build its sewers.',
    choices: [
      { label: 'Invest in Bazalgette\'s sewers', sub: '£300', req: s => s.gold >= 300, run: s => ({ text: 'Eighty miles of brick tunnels beneath the city — and you have the plans. Perfect for travelling unseen.', d: { gold: -300, guilds: 12, susp: -10 } }) },
      { label: 'Endure', run: s => ({ text: 'The dead have smelled worse.', d: {} }) },
    ] },
  { id: 'ripper', year: 1888, month: 7, title: 'The Autumn of Terror', glyph: '🔪',
    text: 'In Whitechapel, women are being butchered in the fog — throats cut, bodies opened. The newspapers scream of a monster. Vigilance committees roam with lanterns. Every shadow is suspect — and yours most of all.',
    apply: s => { s.susp = Math.min(100, s.susp + 20); },
    sleep: 'An unknown killer terrorised Whitechapel.',
    choices: [
      { label: 'Hunt the Whitechapel murderer', sub: 'Guile & Lore', chance: s => Math.min(0.9, 0.2 + (G.attr('guile') + G.attr('lore')) * 0.05),
        run: (s, ok) => {
          if (!ok) return { text: 'You stalk the fog for weeks and find nothing but police and ghosts. A vigilance committee nearly catches you instead.', d: { health: -15, susp: 8 } };
          s.flags.ripperFound = true;
          return { text: 'Mitre Square, a quarter to two. A man in a dark coat kneels over a woman with a small bag of knives. He turns. His face is utterly ordinary. <br><br>You have found him.',
            next: { title: 'The Man in the Dark Coat', glyph: '🔪', text: 'He is not afraid of you. He is <i>delighted</i>. "Another one," he breathes. "Another artist."',
              choices: [
                { label: 'Drain him dry', sub: 'A just meal', run: () => { G.addVictim({ name: 'the Whitechapel murderer', occ: 'surgeon, perhaps' }); return { text: 'His blood is thin and cold and utterly unremarkable. The murders stop. No one will ever know why.', d: { blood: 30, humanity: 4, prestige: 10, susp: -25 } }; } },
                { label: 'Deliver him to the police', sub: 'Allure', run: () => ({ text: 'You leave him bound and bloodied outside Leman Street station with his knives. The police, humiliated, suppress the whole affair. He is quietly committed to an asylum.', d: { humanity: 6, susp: -10 } }) },
                { label: 'Make him your creature', cls: 'dark', req: () => G.ghoulRoom(), run: () => { G.addCircle({ kind: 'ghoul', role: 'guard', name: 'Mr. J—', age: 35, occ: 'murderer', loyalty: 90 }); return { text: 'A monster serving a monster. He will guard your door very, very well.', d: { humanity: -10 } }; } },
              ] } };
        } },
      { label: 'Lie low until it passes', run: s => ({ text: 'You feed only from your herd and walk only in the West End. It is a long autumn.', d: { susp: -8, prestige: -2 } }) },
      { label: 'Let the Ripper take the blame', cls: 'dark', run: s => ({ text: 'A few more bodies in Whitechapel. Who will know which were his?', d: { blood: 30, susp: -20, humanity: -6 } }) },
    ] },
  { id: 'dracula', year: 1897, month: 4, title: '“Dracula”', glyph: '📕',
    text: 'A theatre manager named Stoker has written a novel: <i>Dracula</i>. A count from the Carpathians comes to London to feed. It is the talk of every drawing room. You read it in one night. It is uncomfortably close.',
    sleep: 'Bram Stoker published “Dracula”.',
    choices: [
      { label: 'Visit the author', sub: 'Allure', chance: s => G.chance('allure', 5), run: (s, ok) => ok ? { text: 'You visit Mr. Stoker at the Lyceum. He goes quite pale. "I... made it all up," he says. "Of course you did," you smile.', d: { essence: 5, humanity: 2 } } : { text: 'He is out. You leave a card with no name on it. He keeps it all his life.', d: { essence: 1 } } },
      { label: 'Laugh at the garlic', run: s => ({ text: 'Garlic. Honestly.', d: { humanity: 1 } }) },
    ] },
];

DATA.LABELS = {
  blood: 'Blood', health: 'Health', humanity: 'Humanity', gold: '£', susp: 'Suspicion', essence: 'Essence',
  prestige: 'Prestige', herd: 'Herd', church: 'Church', crown: 'Crown', guilds: 'Guilds', underworld: 'Underworld',
  hours: 'Hours', threat: 'Hunter Threat', havenLoss: 'Haven lost',
};
// Is an increase good (1) or bad (-1) for the player?
DATA.POLARITY = { susp: -1, threat: -1, havenLoss: -1 };
DATA.FACTIONS = {
  church: { name: 'Church', glyph: '✝', desc: 'Suspicion fades faster; hunters can be discredited.' },
  crown: { name: 'Crown', glyph: '♛', desc: 'Court prestige comes easier; needed to seize the throne.' },
  guilds: { name: 'Guilds', glyph: '⚖', desc: 'Your holdings earn more.' },
  underworld: { name: 'Underworld', glyph: '♠', desc: 'Safer hunting; hunters are tracked more easily.' },
};
