import { DoubleSide } from 'three';
import {Sticker, Stickers} from "../../../types.ts";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";
import {isPackStickerKey} from "../../../api/stickerPackApi.ts";

interface Props{
  sticker: {
    index: number,
    sticker: Sticker | string | null,
    rotation: number
  }
  hover?: boolean;
}

const SimSticker = ({ sticker, hover }: Props) => {
  const { textures, packTextures } = useTaskConfig();

  if (!sticker.sticker) return null;

  let texture;
  let scale = 1;

  if (isPackStickerKey(sticker.sticker)) {
    texture = packTextures[sticker.sticker];
    if (!texture) return null; // not yet loaded; will re-render when packTextures updates
  } else {
    const stickerKey = sticker.sticker as Sticker;
    texture = textures[stickerKey];
    const data = Stickers[stickerKey];
    if (data) scale = data.scale ?? 0.75;
  }

  return (
    <mesh position={[0, 0.51 + (hover ? 0.02 : 0) - 0.4, 0]} rotation={[Math.PI / 2, 0, Math.PI + (sticker.rotation * Math.PI) / 180.0]} scale={[-scale, scale, 0]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent={true} side={DoubleSide} color={hover ? 'red' : 'white'} />
    </mesh>
  );
};

export default SimSticker;

