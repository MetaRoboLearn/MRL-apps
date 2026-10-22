import {PropsWithChildren, useState, useEffect} from "react";
import {GridContext} from "./Context.tsx";
import {Barrier, Sticker} from "../types.ts";
import {GridState, Task} from "../types/tasksTypes.ts";
import {isPackStickerKey} from "../api/stickerPackApi.ts";

interface Props {
  task: Task
}

const GridProvider = ({ task: t, children }: PropsWithChildren<Props>) => {
  const [sizeX, setSizeX] = useState<number>(t.size_x);
  const [sizeZ, setSizeZ] = useState<number>(t.size_z);

  const [start, setStart] = useState<number | null>(t.start);
  const [startRotationOffset, setStartRotationOffset] = useState<number>(t.rotation);
  const [finish, setFinish] = useState<number | null>(t.finish);

  const [barriers, setBarriers] = useState<Map<number, Barrier>>(
    new Map(
        (t.barriers || []).map(
          ([index, key]: [number, keyof typeof Barrier]) => [index, Barrier[key]]
        )
      ));
  const [stickers, setStickers] = useState<{ index: number, sticker: Sticker | string, rotation: number }[]>(
    (t.stickers || []).map(({ index, sticker, rotation }) => ({
      index,
      // Pack sticker keys (e.g. "Farma/farmer") are kept as-is.
      // Standard sticker keys are converted from enum key → enum value.
      sticker: isPackStickerKey(sticker)
        ? sticker
        : (Sticker[sticker as keyof typeof Sticker] ?? sticker),
      rotation,
    }))
  );

  const [floorColor, setFloorColor] = useState<string | null>(t.floor_color ?? null);

  // Sync grid state when task changes (e.g., after editing and refetching)
  useEffect(() => {
    setSizeX(t.size_x);
    setSizeZ(t.size_z);
    setStart(t.start);
    setStartRotationOffset(t.rotation);
    setFinish(t.finish);
    setBarriers(new Map(
      (t.barriers || []).map(
        ([index, key]: [number, keyof typeof Barrier]) => [index, Barrier[key]]
      )
    ));
    setStickers(
      (t.stickers || []).map(({ index, sticker, rotation }) => ({
        index,
        sticker: isPackStickerKey(sticker)
          ? sticker
          : (Sticker[sticker as keyof typeof Sticker] ?? sticker),
        rotation,
      }))
    );
    setFloorColor(t.floor_color ?? null);
  }, [t.size_x, t.size_z, t.start, t.rotation, t.finish, t.barriers, t.stickers, t.floor_color]);

  const buildGridState = (): GridState => {
    return {
      size_x: sizeX,
      size_z: sizeZ,
      start,
      start_rotation: startRotationOffset,
      finish,
      barriers: [...barriers.keys()],
      stickers: stickers.map(s => ({ index: s.index, sticker: s.sticker })),
    };
  }

  return (
    <GridContext.Provider value={{
      sizeX, setSizeX,
      sizeZ, setSizeZ,
      start, setStart,
      startRotationOffset, setStartRotationOffset,
      finish, setFinish,
      barriers, setBarriers,
      stickers, setStickers,
      buildGridState,
      floorColor, setFloorColor,
    }}>
      {children}
    </GridContext.Provider>
  );
};

export default GridProvider;