import { useEffect, useState } from 'react';
import { useTaskConfig } from "../../../hooks/useTaskConfig.ts";
import { useStickerPacks } from "../../../hooks/useStickerPacks.ts";

const SimStickerMenu = () => {
  const { selectedSticker, setSelectedSticker, loadPackTextures } = useTaskConfig();
  const { packs, stickers, fetchPacks, fetchPackStickers } = useStickerPacks();
  const [activeTab, setActiveTab] = useState<string>('');

  // Load pack list; auto-select first pack
  useEffect(() => {
    fetchPacks();
  }, []);

  // When packs are loaded, auto-select the first one
  useEffect(() => {
    if (packs.length > 0 && activeTab === '') {
      const first = packs[0].name;
      setActiveTab(first);
      fetchPackStickers(first);
      loadPackTextures(first);
    }
  }, [packs]);

  const handlePackTab = async (packName: string) => {
    setActiveTab(packName);
    await fetchPackStickers(packName);
    loadPackTextures(packName);
  };

  const tabClass = (name: string) =>
    `px-3 py-1 text-xs font-semibold rounded-t border-b-2 transition cursor-pointer ${
      activeTab === name
        ? 'border-turquoise-600 text-turquoise-700 bg-white-smoke-200'
        : 'border-transparent text-gray-500 hover:text-turquoise-600'
    }`;

  return (
    <div className="flex flex-col gap-1">
      {/* Pack tabs */}
      <div className="flex gap-1 border-b border-gray-300 flex-wrap">
        {packs.map(pack => (
          <button key={pack.name} className={tabClass(pack.name)} onClick={() => handlePackTab(pack.name)}>
            {pack.name}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="flex flex-wrap gap-2 overflow-y-auto max-h-40 scrollbar-blue pt-1">
        {/* Remove button always visible */}
        <label className="block cursor-pointer">
          <input
            type="radio"
            name="sticker"
            value="UKLONI"
            className="hidden peer"
            checked={!selectedSticker}
            onChange={() => setSelectedSticker(null)}
          />
          <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg bg-white-smoke-400
                          hover:bg-turquoise-700 hover:text-white-smoke-50
                          peer-checked:ring-2 peer-checked:ring-white peer-checked:bg-turquoise-700 peer-checked:text-white-smoke-50
                          transition">
            <img src="/textures/x.webp" alt="remove" className="w-8 h-8 object-contain" />
            <span className="text-[10px] font-semibold mt-0.5">UKLONI</span>
          </div>
        </label>

        {(stickers[activeTab] ?? []).map(s => (
          <label key={s.key} className="block cursor-pointer">
            <input
              type="radio"
              name="sticker"
              value={s.key}
              className="hidden peer"
              checked={selectedSticker?.toString() === s.key}
              onChange={() => setSelectedSticker(s.key)}
            />
            <div className="w-16 h-16 flex flex-col items-center justify-center rounded-lg bg-white-smoke-400
                            hover:bg-turquoise-700 hover:text-white-smoke-50
                            peer-checked:ring-2 peer-checked:ring-white peer-checked:bg-turquoise-700 peer-checked:text-white-smoke-50
                            transition">
              <img src={s.url} alt={s.name} className="w-8 h-8 object-contain" />
              <span className="text-[10px] font-semibold mt-0.5 text-center leading-tight">{s.name.toUpperCase()}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SimStickerMenu;
