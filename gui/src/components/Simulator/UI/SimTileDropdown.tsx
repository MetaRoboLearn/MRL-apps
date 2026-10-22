import {TileType} from "../../../types.ts";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

interface Props {
  show: boolean;
  setShow: (show: boolean) => void;
}

const SimTileDropdown = ({show, setShow} : Props) => {
  const { selectedType, setSelectedType } = useTaskConfig();

  return (
    <ul
      className={`${!show ? 'hidden' : 'flex'} mx-auto flex-col bg-white-smoke-600 rounded-2xl overflow-hidden shadow translate-y-5`}>
      {Object.values(TileType).map((item: string, index) => (
        <li key={index} className={'bg-white-smoke-400 text-center'}>
          <label className="block">
            <input
              type="radio"
              name="tileType"
              value={item}
              className="hidden peer"
              checked={selectedType.toString() === item}
              onChange={() => {
                setSelectedType(item as TileType);
                setShow(false);
              }}
            />
            <div
              className="text-md font-semibold px-4 py-2 cursor-pointer text-dark-neutrals-400
                                hover:bg-turquoise-700 hover:text-white-smoke-50
                                peer-checked:bg-turquoise-700 peer-checked:text-white-smoke-50">
              {item.toUpperCase()}
            </div>
          </label>
        </li>
      ))}
    </ul>
  );
};

export default SimTileDropdown;
