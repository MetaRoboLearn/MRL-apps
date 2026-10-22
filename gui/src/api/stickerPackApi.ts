export interface StickerPack {
  name: string;
  count: number;
}

export interface PackStickerMeta {
  key: string;   // "{PackName}/{stem}"  e.g. "Farma/farmer"
  name: string;  // display name
  url: string;   // "/api/stickers/image/{PackName}/{file}.webp"
}

export const getStickerPacks = async (): Promise<StickerPack[]> => {
  const res = await fetch('/api/stickers/packs', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch sticker packs');
  return res.json();
};

export const getPackStickers = async (packName: string): Promise<PackStickerMeta[]> => {
  const res = await fetch(`/api/stickers/pack/${encodeURIComponent(packName)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to fetch stickers for pack: ${packName}`);
  return res.json();
};

/** Derive the image URL from a pack sticker key stored in the DB. */
export const packStickerUrl = (key: string): string => {
  const [pack, stem] = key.split('/');
  return `/api/stickers/image/${encodeURIComponent(pack)}/${encodeURIComponent(stem)}.webp`;
};

/** Returns true when a sticker key belongs to a backend pack (contains '/') */
export const isPackStickerKey = (key: string): boolean => key.includes('/');
