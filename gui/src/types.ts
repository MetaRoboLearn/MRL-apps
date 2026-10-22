// common use for 3d and movement
export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface MoveCommand {
  type: 'move' | 'rotate' | 'display' | 'display_clear' | 'detect' | 'print' | 'sleep';
  direction?: 'forward' | 'backward' | 'left' | 'right';
  blocked?: boolean;
  value?: string;
  result?: string;
}



// grid stuff
export enum TileType {
  START = 'Početak',
  FINISH = 'Kraj',
  GROUND = 'Tlo',
  BARRIER = 'Prepreka',
  STICKER = 'Naljepnica'
}

export enum Barrier {
  TREES = 'Drveće',
  FOUNTAIN = 'Fontana',
  LAKE = 'Jezero',
  FILED = 'Polje',
}

interface BarrierData {
  key: string;    
  image: string;
  model?: string;
}

export const Barriers: Record<Barrier, BarrierData> = {
  [Barrier.TREES]: {
    key: 'TREES',
    image: '/textures/trees.webp',
  },
  [Barrier.FOUNTAIN]:{
    key: 'FOUNTAIN',
    image: '/textures/fountain.webp',
  },
  [Barrier.LAKE]: {
    key: 'LAKE',
    image: '/textures/lake.webp',
  },
  [Barrier.FILED]: {
    key: 'FILED',
    image: '/textures/field.webp',
  },
}

// Full enum kept for backward compat with existing saved tasks.
// Images are now served from backend packs.
export enum Sticker {
  TREES = 'trees',
  LAKE = 'lake',
  FOUNTAIN = 'fountain',
  ROAD_INTERSECT = 'Raskržije',
  ROAD_T = 'T raskržije',
  ROAD_STRAIGHT = 'Cesta',
  ROAD_TURN = 'Zavoj',
  HOUSE_GREEN = 'green house',
  HOUSE_RED = 'red house',
  HOUSE_RED_SANTA = 'Crvena kuća (Djed Mraz)',
  HOUSE_BLUE = 'blue house',
  HOUSE_YELLOW = 'yellow house',
  POST_OFFICE = 'post office',
  RESTAURANT = 'restaurant',
  WAREHOUSE = 'warehouse',
  ELF_WORKSHOP = 'Radionica patuljaka',
  BEAR = 'bear',
  BENCH = 'bench',
  BIRD = 'bird',
  C_BLUE_YELLOW = 'c blue yellow',
  C_GREEN_BLUE = 'c green blue',
  C_GREEN_YELLOW = 'c green yellow',
  CAT = 'cat',
  CELLPHONE = 'cellphone',
  COW = 'cow',
  DOG = 'dog',
  DONUT = 'donut',
  ELEPHANT = 'elephant',
  FARMA = 'farma',
  FENCE_GREEN = 'fence green',
  GIRAFFE = 'giraffe',
  HORSE = 'horse',
  L_BLUE = 'l blue',
  L_GREEN = 'l green',
  L_YELLOW = 'l yellow',
  LJUBIMCI = 'ljubimci',
  PERSON = 'person',
  RESTAURANT_ZOO = 'zoo restaurant',
  S_BLUE_BROWN = 's blue brown',
  S_BLUE_YELLOW = 's blue yellow',
  S_BLUE = 's blue',
  S_BROWN_YELLOW = 's brown yellow',
  S_GREEN_BLUE = 's green blue',
  S_GREEN_BROWN = 's green brown',
  S_GREEN_YELLOW = 's green yellow',
  S_GREEN = 's green',
  S_YELLOW = 's yellow',
  SAFARI = 'safari',
  SHEEP = 'sheep',
  SUMSKE_ZIVOTINJE = 'sumske zivotinje',
  T_BLUE_BROWN_GREEN = 't blue brown green',
  T_GREEN_BROWN_GREEN = 't green brown green',
  T_GREEN_BROWN_YELLOW = 't green brown yellow',
  T_GREEN = 't green',
  T_YELLOW_BROWN_BLUE = 't yellow brown blue',
  ZEBRA = 'zebra',
}

interface StickerData {
  key: string
  image: string,
  scale?: number,
}

const OPC  = (f: string) => `/api/stickers/image/Opcenito/${f}`;
const GRAD = (f: string) => `/api/stickers/image/Grad/${f}`;
const BOZ  = (f: string) => `/api/stickers/image/Bozicni/${f}`;
const ZOO  = (f: string) => `/api/stickers/image/ZOO/${f}`;

export const Stickers: Record<Sticker, StickerData> = {
  [Sticker.TREES]: { key: 'TREES', image: '/textures/trees.webp', scale: 0.8 },
  [Sticker.FOUNTAIN]: { key: 'FOUNTAIN', image: '/textures/fountain.webp', scale: 0.8 },
  [Sticker.LAKE]: { key: 'LAKE', image: '/textures/lake.webp', scale: 0.8 },
  [Sticker.ROAD_INTERSECT]: { key: 'ROAD_INTERSECT', image: OPC('road_intersect.webp'), scale: 1 },
  [Sticker.ROAD_T]: { key: 'ROAD_T', image: OPC('road_t.webp'), scale: 1 },
  [Sticker.ROAD_STRAIGHT]: { key: 'ROAD_STRAIGHT', image: OPC('road_straight.webp'), scale: 1 },
  [Sticker.ROAD_TURN]: { key: 'ROAD_TURN', image: OPC('road_turn.webp'), scale: 1 },
  [Sticker.HOUSE_GREEN]: { key: 'HOUSE_GREEN', image: GRAD('house_green.webp'), scale: 0.75 },
  [Sticker.HOUSE_RED]: { key: 'HOUSE_RED', image: GRAD('house_red.webp'), scale: 0.75 },
  [Sticker.HOUSE_RED_SANTA]: { key: 'HOUSE_RED_SANTA', image: BOZ('house_red_santa.webp'), scale: 1 },
  [Sticker.HOUSE_BLUE]: { key: 'HOUSE_BLUE', image: GRAD('house_blue.webp'), scale: 0.75 },
  [Sticker.HOUSE_YELLOW]: { key: 'HOUSE_YELLOW', image: GRAD('house_yellow.webp'), scale: 0.75 },
  [Sticker.POST_OFFICE]: { key: 'POST_OFFICE', image: GRAD('post_office.webp'), scale: 0.75 },
  [Sticker.RESTAURANT]: { key: 'RESTAURANT', image: GRAD('restoraunt.webp'), scale: 0.75 },
  [Sticker.WAREHOUSE]: { key: 'WAREHOUSE', image: GRAD('warehouse.webp'), scale: 0.75 },
  [Sticker.ELF_WORKSHOP]: { key: 'ELF_WORKSHOP', image: BOZ('elf_workshop.webp'), scale: 1 },
  [Sticker.BEAR]: { key: 'BEAR', image: ZOO('bear.webp'), scale: 1 },
  [Sticker.BENCH]: { key: 'BENCH', image: ZOO('bench.webp'), scale: 1 },
  [Sticker.BIRD]: { key: 'BIRD', image: ZOO('bird.webp'), scale: 1 },
  [Sticker.C_BLUE_YELLOW]: { key: 'C_BLUE_YELLOW', image: ZOO('c blue yellow.webp'), scale: 1 },
  [Sticker.C_GREEN_BLUE]: { key: 'C_GREEN_BLUE', image: ZOO('c green blue.webp'), scale: 1 },
  [Sticker.C_GREEN_YELLOW]: { key: 'C_GREEN_YELLOW', image: ZOO('c green yellow.webp'), scale: 1 },
  [Sticker.CAT]: { key: 'CAT', image: ZOO('cat.webp'), scale: 1 },
  [Sticker.CELLPHONE]: { key: 'CELLPHONE', image: ZOO('cellphone.webp'), scale: 1 },
  [Sticker.COW]: { key: 'COW', image: ZOO('cow.webp'), scale: 1 },
  [Sticker.DOG]: { key: 'DOG', image: ZOO('dog.webp'), scale: 1 },
  [Sticker.DONUT]: { key: 'DONUT', image: ZOO('donut.webp'), scale: 1 },
  [Sticker.ELEPHANT]: { key: 'ELEPHANT', image: ZOO('elephant.webp'), scale: 1 },
  [Sticker.FARMA]: { key: 'FARMA', image: ZOO('farma.webp'), scale: 1 },
  [Sticker.FENCE_GREEN]: { key: 'FENCE_GREEN', image: ZOO('fence green.webp'), scale: 1 },
  [Sticker.GIRAFFE]: { key: 'GIRAFFE', image: ZOO('giraffe.webp'), scale: 1 },
  [Sticker.HORSE]: { key: 'HORSE', image: ZOO('horse.webp'), scale: 1 },
  [Sticker.L_BLUE]: { key: 'L_BLUE', image: ZOO('l blue.webp'), scale: 1 },
  [Sticker.L_GREEN]: { key: 'L_GREEN', image: ZOO('l green.webp'), scale: 1 },
  [Sticker.L_YELLOW]: { key: 'L_YELLOW', image: ZOO('l yellow.webp'), scale: 1 },
  [Sticker.LJUBIMCI]: { key: 'LJUBIMCI', image: ZOO('ljubimci.webp'), scale: 1 },
  [Sticker.PERSON]: { key: 'PERSON', image: ZOO('person.webp'), scale: 1 },
  [Sticker.RESTAURANT_ZOO]: { key: 'RESTAURANT_ZOO', image: ZOO('restaurant.webp'), scale: 1 },
  [Sticker.S_BLUE_BROWN]: { key: 'S_BLUE_BROWN', image: ZOO('s blue brown.webp'), scale: 1 },
  [Sticker.S_BLUE_YELLOW]: { key: 'S_BLUE_YELLOW', image: ZOO('s blue yellow.webp'), scale: 1 },
  [Sticker.S_BLUE]: { key: 'S_BLUE', image: ZOO('s blue.webp'), scale: 1 },
  [Sticker.S_BROWN_YELLOW]: { key: 'S_BROWN_YELLOW', image: ZOO('s brown yellow.webp'), scale: 1 },
  [Sticker.S_GREEN_BLUE]: { key: 'S_GREEN_BLUE', image: ZOO('s green blue.webp'), scale: 1 },
  [Sticker.S_GREEN_BROWN]: { key: 'S_GREEN_BROWN', image: ZOO('s green brown.webp'), scale: 1 },
  [Sticker.S_GREEN_YELLOW]: { key: 'S_GREEN_YELLOW', image: ZOO('s green yellow.webp'), scale: 1 },
  [Sticker.S_GREEN]: { key: 'S_GREEN', image: ZOO('s green.webp'), scale: 1 },
  [Sticker.S_YELLOW]: { key: 'S_YELLOW', image: ZOO('s yellow.webp'), scale: 1 },
  [Sticker.SAFARI]: { key: 'SAFARI', image: ZOO('safari.webp'), scale: 1 },
  [Sticker.SHEEP]: { key: 'SHEEP', image: ZOO('sheep.webp'), scale: 1 },
  [Sticker.SUMSKE_ZIVOTINJE]: { key: 'SUMSKE_ZIVOTINJE', image: ZOO('sumske zivotinje.webp'), scale: 1 },
  [Sticker.T_BLUE_BROWN_GREEN]: { key: 'T_BLUE_BROWN_GREEN', image: ZOO('t blue brown green.webp'), scale: 1 },
  [Sticker.T_GREEN_BROWN_GREEN]: { key: 'T_GREEN_BROWN_GREEN', image: ZOO('t green brown green.webp'), scale: 1 },
  [Sticker.T_GREEN_BROWN_YELLOW]: { key: 'T_GREEN_BROWN_YELLOW', image: ZOO('t green brown yellow.webp'), scale: 1 },
  [Sticker.T_GREEN]: { key: 'T_GREEN', image: ZOO('t green.webp'), scale: 1 },
  [Sticker.T_YELLOW_BROWN_BLUE]: { key: 'T_YELLOW_BROWN_BLUE', image: ZOO('t yellow brown blue.webp'), scale: 1 },
  [Sticker.ZEBRA]: { key: 'ZEBRA', image: ZOO('zebra.webp'), scale: 1 },
};