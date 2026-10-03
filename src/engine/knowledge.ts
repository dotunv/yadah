/**
 * What there is to know. *Yadah* means "to know", and the house is built to
 * know things: at the bottom of the garden is a pond, and the pond leads to
 * seven far places. In each, five things can be learned by resting the lamp on
 * them. Learning is not the same as knowing: a thing is only *known* once you
 * can give it back when Yadah asks.
 *
 * Every fact here is a well-established one. Where something is a legend or a
 * tradition rather than a record, the text says so.
 */

export const FAR_IDS = ['japan', 'ethiopia', 'peru', 'iceland', 'india', 'aotearoa', 'morocco'] as const
export type FarId = (typeof FAR_IDS)[number]

export type Tag = 'language' | 'food' | 'history' | 'nature' | 'craft' | 'belief' | 'custom' | 'number'

export interface Fact {
  id: string
  place: FarId
  tag: Tag
  /** What you are told. */
  text: string
  /** What Yadah later asks, to see if you kept it. */
  q: string
  /** The right answer, short enough to read at a glance. */
  a: string
  /** Two wrong ones that are not silly. */
  d: [string, string]
}

export interface FarPlace {
  id: FarId
  /** Written on the floor on arrival. */
  name: string
  /** One line, once. */
  epigraph: string
  hue: number
}

export const FAR: Record<FarId, FarPlace> = {
  japan: { id: 'japan', name: 'Japan', epigraph: 'a country of more than six thousand islands.', hue: 350 },
  ethiopia: { id: 'ethiopia', name: 'Ethiopia', epigraph: 'one of the oldest homes of people, and of coffee.', hue: 70 },
  peru: { id: 'peru', name: 'Peru', epigraph: 'where the Andes meet the Amazon.', hue: 28 },
  iceland: { id: 'iceland', name: 'Iceland', epigraph: 'ice on top and fire underneath.', hue: 205 },
  india: { id: 'india', name: 'India', epigraph: 'more than a thousand million people, and a great many languages.', hue: 38 },
  aotearoa: { id: 'aotearoa', name: 'Aotearoa', epigraph: 'the Māori name for New Zealand.', hue: 165 },
  morocco: { id: 'morocco', name: 'Morocco', epigraph: 'between the sea, the mountains and the desert.', hue: 14 },
}

export const FACTS: Fact[] = [
  // ── Japan ───────────────────────────────────────────────────────────
  {
    id: 'jp-kintsugi', place: 'japan', tag: 'craft',
    text: 'Kintsugi mends broken pottery with lacquer dusted in gold. The cracks are kept and shown, because the break is part of the object’s history.',
    q: 'What does kintsugi use to mend broken pottery?', a: 'gold-dusted lacquer', d: ['clear glue', 'melted silver wire'],
  },
  {
    id: 'jp-komorebi', place: 'japan', tag: 'language',
    text: 'Komorebi is a Japanese word for sunlight filtering through the leaves of trees. English has no single word for it.',
    q: 'What does the word komorebi name?', a: 'sunlight through leaves', d: ['the first snowfall', 'a quiet room'],
  },
  {
    id: 'jp-ma', place: 'japan', tag: 'belief',
    text: 'Ma (間) is the meaning held in an empty space: the pause in a conversation, the gap between two notes, the unfilled corner of a room.',
    q: 'What is ma?', a: 'meaning in emptiness', d: ['a kind of tea', 'a spring festival'],
  },
  {
    id: 'jp-islands', place: 'japan', tag: 'nature',
    text: 'Japan is made of more than six thousand islands, though most people live on four large ones: Honshu, Hokkaido, Kyushu and Shikoku.',
    q: 'About how many islands make up Japan?', a: 'over six thousand', d: ['a few hundred', 'about forty'],
  },
  {
    id: 'jp-wabisabi', place: 'japan', tag: 'belief',
    text: 'Wabi-sabi finds beauty in what is imperfect, impermanent and incomplete: a worn cup, a moss-covered stone, a bowl with a crack.',
    q: 'Wabi-sabi finds beauty in what?', a: 'imperfection', d: ['perfect symmetry', 'bright colour'],
  },
  // ── Ethiopia ────────────────────────────────────────────────────────
  {
    id: 'et-calendar', place: 'ethiopia', tag: 'number',
    text: 'Ethiopia keeps its own calendar: thirteen months, twelve of thirty days and a short one of five or six. It runs about seven to eight years behind the one most of the world uses.',
    q: 'How many months are in the Ethiopian calendar?', a: 'thirteen', d: ['ten', 'twenty'],
  },
  {
    id: 'et-geez', place: 'ethiopia', tag: 'language',
    text: 'Ethiopia has its own ancient writing system, the Ge’ez script. Each symbol stands for a consonant joined to a vowel.',
    q: 'What is Ethiopia’s ancient script called?', a: 'Ge’ez', d: ['Cuneiform', 'Tifinagh'],
  },
  {
    id: 'et-coffee', place: 'ethiopia', tag: 'food',
    text: 'Coffee is thought to have first grown in the highlands of Ethiopia. A legend says a goat herder named Kaldi saw his goats dancing after they ate the berries.',
    q: 'Where is coffee thought to come from?', a: 'Ethiopia', d: ['Colombia', 'Vietnam'],
  },
  {
    id: 'et-lalibela', place: 'ethiopia', tag: 'history',
    text: 'In Lalibela, eleven churches were cut down into solid rock in the 12th and 13th centuries. They are still used for worship today.',
    q: 'How were the churches of Lalibela made?', a: 'carved down into rock', d: ['built from timber', 'stacked from brick'],
  },
  {
    id: 'et-injera', place: 'ethiopia', tag: 'food',
    text: 'Injera, the sour flatbread, is made from teff, a tiny grain native to Ethiopia. Meals are often shared from one large plate and eaten by hand.',
    q: 'Which grain is injera made from?', a: 'teff', d: ['rice', 'oats'],
  },
  // ── Peru ────────────────────────────────────────────────────────────
  {
    id: 'pe-khipu', place: 'peru', tag: 'history',
    text: 'The Inca kept records without writing, using khipu: cords with knots whose type and position stood for numbers.',
    q: 'What did the Inca use to keep records?', a: 'knotted cords', d: ['clay tablets', 'painted scrolls'],
  },
  {
    id: 'pe-potato', place: 'peru', tag: 'food',
    text: 'The potato was first domesticated in the Andes, thousands of years ago. Peru still grows thousands of varieties, in colours from purple to yellow.',
    q: 'Where were potatoes first domesticated?', a: 'the Andes', d: ['Ireland', 'Russia'],
  },
  {
    id: 'pe-titicaca', place: 'peru', tag: 'nature',
    text: 'Lake Titicaca, shared by Peru and Bolivia, is among the highest lakes in the world that boats can sail, at about 3,800 metres above the sea.',
    q: 'What is notable about Lake Titicaca?', a: 'it is very high up', d: ['it is very salty', 'it is very shallow'],
  },
  {
    id: 'pe-machu', place: 'peru', tag: 'craft',
    text: 'Machu Picchu was built around 1450 for the Inca ruler Pachacuti. Its stones are cut so closely that no mortar was needed to hold them.',
    q: 'What holds the stones of Machu Picchu together?', a: 'nothing but their fit', d: ['lime plaster', 'iron pins'],
  },
  {
    id: 'pe-quechua', place: 'peru', tag: 'language',
    text: 'Quechua, the language of the Inca, is still spoken by millions of people across the Andes and is an official language of Peru.',
    q: 'Which language of the Inca is still spoken today?', a: 'Quechua', d: ['Latin', 'Nahuatl'],
  },
  // ── Iceland ─────────────────────────────────────────────────────────
  {
    id: 'is-althing', place: 'iceland', tag: 'history',
    text: 'Iceland’s parliament, the Althing, first met in the year 930. It is often called the oldest parliament still in existence.',
    q: 'What is Iceland’s parliament called?', a: 'the Althing', d: ['the Storting', 'the Folketing'],
  },
  {
    id: 'is-books', place: 'iceland', tag: 'custom',
    text: 'On Christmas Eve, Icelanders give each other books and spend the night reading. The custom is called Jólabókaflóð, the Christmas book flood.',
    q: 'What do Icelanders traditionally give on Christmas Eve?', a: 'books', d: ['candles', 'dried fish'],
  },
  {
    id: 'is-names', place: 'iceland', tag: 'language',
    text: 'Many Icelanders take their surname from a parent’s first name, as in Jónsdóttir, “Jón’s daughter”. Family names are rare.',
    q: 'Icelandic surnames are usually made from what?', a: 'a parent’s first name', d: ['the home village', 'the family trade'],
  },
  {
    id: 'is-heat', place: 'iceland', tag: 'nature',
    text: 'Most homes in Iceland are heated with hot water that comes from deep underground, warmed by the earth itself.',
    q: 'What heats most homes in Iceland?', a: 'hot water from the earth', d: ['coal', 'wood stoves'],
  },
  {
    id: 'is-plates', place: 'iceland', tag: 'nature',
    text: 'Iceland sits where two tectonic plates, the North American and the Eurasian, are slowly pulling apart. At Þingvellir you can walk in the gap between them.',
    q: 'Which two plates meet beneath Iceland?', a: 'North American and Eurasian', d: ['Pacific and African', 'Indian and Antarctic'],
  },
  // ── India ───────────────────────────────────────────────────────────
  {
    id: 'in-zero', place: 'india', tag: 'number',
    text: 'Mathematicians in India treated zero as a number you can calculate with. Brahmagupta wrote down the rules for it in the year 628.',
    q: 'What did Brahmagupta write rules for in 628?', a: 'zero', d: ['negative squares', 'the calendar'],
  },
  {
    id: 'in-languages', place: 'india', tag: 'language',
    text: 'India’s constitution recognises twenty-two languages, and hundreds more are spoken. A banknote shows its value in many of them.',
    q: 'How many languages does India’s constitution list?', a: 'twenty-two', d: ['five', 'two hundred'],
  },
  {
    id: 'in-chess', place: 'india', tag: 'history',
    text: 'The game that became chess, chaturanga, was played in India by about the 6th century. Its name means “four divisions”, of an army.',
    q: 'Which game grew out of India’s chaturanga?', a: 'chess', d: ['backgammon', 'draughts'],
  },
  {
    id: 'in-diwali', place: 'india', tag: 'custom',
    text: 'Diwali, the festival of lights, is marked by lighting small oil lamps called diyas. In different traditions it celebrates light over darkness.',
    q: 'Diwali is the festival of what?', a: 'lights', d: ['colours', 'kites'],
  },
  {
    id: 'in-stepwell', place: 'india', tag: 'craft',
    text: 'Stepwells, like Rani ki vav in Gujarat, reach down many storeys to the water, with carved stairways and halls. They were places to gather as well as to draw water.',
    q: 'What is a stepwell?', a: 'a well with stairs down to it', d: ['a stone fountain', 'a watchtower'],
  },
  // ── Aotearoa ────────────────────────────────────────────────────────
  {
    id: 'nz-name', place: 'aotearoa', tag: 'language',
    text: 'Aotearoa is the Māori name for New Zealand. It is often translated as “land of the long white cloud”.',
    q: 'Aotearoa is often translated as what?', a: 'land of the long white cloud', d: ['land of the rising sun', 'land of fire'],
  },
  {
    id: 'nz-hongi', place: 'aotearoa', tag: 'custom',
    text: 'A hongi is a greeting in which two people press their noses and foreheads together. It is said to share the breath of life.',
    q: 'In a hongi, what do two people press together?', a: 'noses and foreheads', d: ['palms', 'cheeks'],
  },
  {
    id: 'nz-vote', place: 'aotearoa', tag: 'history',
    text: 'In 1893, New Zealand became the first self-governing country to give women the right to vote in national elections.',
    q: 'What did New Zealand give women first, in 1893?', a: 'the right to vote', d: ['the right to own land', 'a public holiday'],
  },
  {
    id: 'nz-haka', place: 'aotearoa', tag: 'custom',
    text: 'The haka is a Māori ceremonial dance of chanting and strong movement. It is performed to welcome guests, to honour people, and to mourn, not only before a fight.',
    q: 'Besides war, what is the haka performed for?', a: 'welcome and honour', d: ['selling goods', 'forecasting weather'],
  },
  {
    id: 'nz-kiwi', place: 'aotearoa', tag: 'nature',
    text: 'The kiwi is a flightless bird that is active at night, and a national symbol. New Zealanders are sometimes called Kiwis after it.',
    q: 'What is special about the kiwi bird?', a: 'it cannot fly', d: ['it sings at dawn', 'it lives in the sea'],
  },
  // ── Morocco ─────────────────────────────────────────────────────────
  {
    id: 'ma-qarawiyyin', place: 'morocco', tag: 'history',
    text: 'The University of al-Qarawiyyin in Fez was founded in the year 859 by a woman, Fatima al-Fihri. It is often called the oldest continuously operating university in the world.',
    q: 'Who founded al-Qarawiyyin in 859?', a: 'Fatima al-Fihri', d: ['Ibn Battuta', 'Harun al-Rashid'],
  },
  {
    id: 'ma-zellige', place: 'morocco', tag: 'craft',
    text: 'Zellige is mosaic made of hand-cut glazed tiles, set into geometric patterns of stars and polygons. Each piece is cut one at a time with a hammer.',
    q: 'What is zellige made of?', a: 'hand-cut glazed tiles', d: ['painted glass', 'carved wood'],
  },
  {
    id: 'ma-tea', place: 'morocco', tag: 'custom',
    text: 'Mint tea is offered as a sign of welcome, and poured from a height so that a foam forms on top.',
    q: 'Why is Moroccan mint tea poured from a height?', a: 'to make foam', d: ['to cool it', 'to mix the sugar'],
  },
  {
    id: 'ma-medina', place: 'morocco', tag: 'nature',
    text: 'The old medina of Fez, Fes el-Bali, is one of the largest car-free urban areas in the world, a maze of thousands of lanes.',
    q: 'Fes el-Bali is among the largest places in the world without what?', a: 'cars', d: ['shops', 'rain'],
  },
  {
    id: 'ma-tamazight', place: 'morocco', tag: 'language',
    text: 'Tamazight, the language of the Amazigh (Berber) people, became an official language of Morocco in 2011, alongside Arabic.',
    q: 'Which language became official in Morocco in 2011, with Arabic?', a: 'Tamazight', d: ['French', 'Spanish'],
  },
]

export const FACT_BY_ID = Object.fromEntries(FACTS.map((f) => [f.id, f])) as Record<string, Fact>
export const factsOf = (p: FarId) => FACTS.filter((f) => f.place === p)

export const TAG_LABEL: Record<Tag, string> = {
  language: 'language',
  food: 'food',
  history: 'history',
  nature: 'nature',
  craft: 'craft',
  belief: 'belief',
  custom: 'custom',
  number: 'numbers',
}

/** What Yadah says when it learns something at the same moment you do. */
export const REACTIONS = [
  'I didn’t know that.',
  'now there are two of us who know.',
  'I will keep that.',
  'that is stranger than I thought.',
  'it is easier to keep when someone else does too.',
  'I wonder who else knows this.',
  'say it again, later. I want to be sure.',
]

/** The ones you have been told but could not yet give back, oldest first. */
export const unrecalled = (learned: string[], recalled: string[]) => learned.filter((id) => !recalled.includes(id))

/** How many of a place's five you have, and how many you can give back. */
export const progressOf = (p: FarId, learned: string[], recalled: string[]) => {
  const ids = factsOf(p).map((f) => f.id)
  return { learned: ids.filter((i) => learned.includes(i)).length, known: ids.filter((i) => recalled.includes(i)).length, of: ids.length }
}
