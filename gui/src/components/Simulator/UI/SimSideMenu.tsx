import SimBarrierMenu from "./SimBarrierMenu.tsx";
import { TileType } from "../../../types.ts";
import SimStickerMenu from "./SimStickerMenu.tsx";
import { BsXLg } from "react-icons/bs";

interface Props {
  show: boolean;
  setShow: (show: boolean) => void;
  type: TileType;
}

const SimSideMenu = ({ show, setShow, type }: Props) => {
  return (
    <div className={`${!show ? 'translate-y-full' : ''} absolute bottom-0 left-0 w-full transition duration-300 z-30`}>
      <div className="absolute inset-0 bg-turquoise-600 opacity-50 pointer-events-none" />
      <div className="relative px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white uppercase tracking-wide">
            {type === TileType.BARRIER ? 'Prepreke' : 'Naljepnice'}
          </span>
          <BsXLg
            className="stroke-2 stroke-white cursor-pointer hover:opacity-70 transition"
            onClick={() => setShow(false)}
          />
        </div>
        {type === TileType.BARRIER ? <SimBarrierMenu /> : null}
        {type === TileType.STICKER ? <SimStickerMenu /> : null}
      </div>
    </div>
  );
};

export default SimSideMenu;