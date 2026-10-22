import { useCallback, useState } from 'react';
import { getStickerPacks, getPackStickers, PackStickerMeta, StickerPack } from '../api/stickerPackApi.ts';

export const useStickerPacks = () => {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [packsLoaded, setPacksLoaded] = useState(false);
  const [stickers, setStickers] = useState<Record<string, PackStickerMeta[]>>({});

  const fetchPacks = useCallback(async () => {
    if (packsLoaded) return;
    try {
      const data = await getStickerPacks();
      setPacks(data);
      setPacksLoaded(true);
    } catch (e) {
      console.error('Failed to load sticker packs', e);
    }
  }, [packsLoaded]);

  const fetchPackStickers = useCallback(async (packName: string) => {
    if (stickers[packName]) return;            // already loaded
    try {
      const data = await getPackStickers(packName);
      setStickers(prev => ({ ...prev, [packName]: data }));
    } catch (e) {
      console.error(`Failed to load stickers for pack "${packName}"`, e);
    }
  }, [stickers]);

  return { packs, packsLoaded, stickers, fetchPacks, fetchPackStickers };
};
