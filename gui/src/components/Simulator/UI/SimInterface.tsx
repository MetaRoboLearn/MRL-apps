import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";
import {TileType} from "../../../types.ts";
import {useVehicle} from "../../../hooks/useVehicle.ts";
import {useUI} from "../../../hooks/useUI.ts";
import {useGrid} from "../../../hooks/useGrid.ts";
import {useEffect, useState} from "react";
import SimTileDropdown from "./SimTileDropdown.tsx";
import {useCode} from "../../../hooks/useCode.ts";
import SimSpeedSlider from "./SimSpeedSlider.tsx";
import {BsArrowLeftCircleFill, BsChevronLeft, BsChevronRight, BsGearFill} from "react-icons/bs";
import {TbCircleDashedLetterA, TbCircleDashedLetterD} from "react-icons/tb";
import SimSideMenu from "./SimSideMenu.tsx";
// import Modal from "./Modal.tsx";

interface Props{
  isHovered: boolean,
}

const SimInterface = ({isHovered}: Props) => {
  const { simFocused, setSimFocused,
    selectedType, setSelectedType,
    animationSpeed, rotateBy90,
    selectedRotation, mode} = useTaskConfig();
  const { start, sizeX, sizeZ, startRotationOffset } = useGrid();
  const { modalVisible } = useUI();
  const { position, rotation, isMoving, moveQueue } = useVehicle();
  const { code, blocks} = useCode();

  const [tileIndex, setTileIndex] = useState(0);
  const [showTileDropdown, setShowTileDropdown] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const tileValues = Object.values(TileType);
  const dev = false;
  const allowEdit = mode != 'solve';

  const selectNextType = () => {
    const nextIndex = (tileIndex + 1) % tileValues.length;
    setTileIndex(nextIndex);
    setSelectedType(tileValues[nextIndex] as TileType);
  };

  const selectPreviousType = () => {
    const prevIndex = (tileIndex - 1 + tileValues.length) % tileValues.length;
    setTileIndex(prevIndex);
    setSelectedType(tileValues[prevIndex] as TileType);
  };

  useEffect(() => {
    setTileIndex(Object.values(TileType).indexOf(selectedType));
  }, [selectedType]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!simFocused || modalVisible) return;

      if (event.key === 'r') {
        rotateBy90();
      }
      else if (event.key === 'a') {
        selectPreviousType();
      }
      else if (event.key === 'd') {
        selectNextType();
      }
      else if (event.key === 's') {
        setShowSideMenu(!showSideMenu);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalVisible, rotateBy90, selectedType, simFocused, showSideMenu]);

  return (
    <>
      <div className={`${dev ? '' : 'hidden'} absolute w-full h-full text-white-smoke-50 text-lg text-left p-5 pointer-events-none`}>
        <h1>pos [x: {position.x}, y: {position.y}, z: {position.z}]</h1>
        <h1>rot [x: {rotation.x}, y: {rotation.y}, z: {rotation.z}]</h1>
        <h1>selectedRotation: [{selectedRotation}]</h1>
        <h1>moveQueue: [{moveQueue.length}]</h1>
        <h1>isMoving: [{isMoving.toString()}]</h1>
        <h1>animationSpeed: [{animationSpeed}]</h1>
        <h1>start: [{start}]</h1>
        <h1>startRotationOffset: [{startRotationOffset}]</h1>
        <h1>sizeX: [{sizeX}], sizeZ: [{sizeZ}]</h1>
        <h1>code: {code}</h1>
        <h1>blocks: {blocks}</h1>
        {/*<h1>validWorkspace: {isValidWorkspace.toString()}</h1>*/}
      </div>

      <div className={`absolute bottom-5 text-lg text-center font-semibold text-dark-neutrals-500 bg-white/80 px-4 py-2 rounded shadow transition-opacity duration-200 select-none
                      ${!simFocused && isHovered && !modalVisible && !isMoving && allowEdit ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
           onClick={() => {
             setSimFocused(true)
           }}>
        ✏️ Pritisni za uređivanje simulacije
      </div>

      <div
        className={`absolute bottom-5 select-none transition-opacity duration-200 ${simFocused ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        <SimTileDropdown show={showTileDropdown} setShow={setShowTileDropdown} />

        <div
          className={`${selectedType === TileType.STICKER || selectedType === TileType.START ? 'flex' : 'hidden'} mb-2 flex justify-center items-center`}>
          <span className={'text-lg font-bold text-dark-neutrals-400 mr-4 whitespace-nowrap'}>
            Pritisni R za rotaciju!
          </span>
        </div>

        <SimSpeedSlider />

        <div className={'flex justify-between'}>
          <div
            className={`text-lg text-center font-semibold text-white-smoke-500 bg-tomato-600 p-2 rounded shadow cursor-pointer`}
            onClick={() => setSimFocused(false)}>
            <BsArrowLeftCircleFill size={20}/>
          </div>
          <div className="mx-10 flex items-center justify-center">
            <span className={'flex items-center cursor-pointer'} onClick={selectPreviousType}>
              <BsChevronLeft size={15} className={'stroke-3 stroke-white-smoke-900'}/>
              <TbCircleDashedLetterA size={25} className={'stroke-3 stroke-white-smoke-900'}/>
            </span>
            <span
              className="w-50 text-center text-3xl font-display font-bold mx-4 text-dark-neutrals-500 cursor-pointer"
              onClick={() => setShowTileDropdown(!showTileDropdown)}>
              {selectedType.toUpperCase()}
            </span>
            <span className={'flex items-center cursor-pointer'} onClick={selectNextType}>
              <TbCircleDashedLetterD size={25} className={'stroke-3 stroke-white-smoke-900'}/>
              <BsChevronRight size={15} className={'stroke-3 stroke-white-smoke-900'}/></span>
          </div>
          <button
            className={`text-lg text-center font-semibold text-dark-neutrals-400 p-2 rounded shadow bg-sunglow-500 cursor-pointer transition`}
            onClick={() => setShowSideMenu(!showSideMenu)}>
            <BsGearFill size={20}/>
          </button>
        </div>
      </div>

      <SimSideMenu show={showSideMenu} setShow={setShowSideMenu} type={selectedType} />
      {/*<Modal/>*/}
    </>
  );
};

export default SimInterface;