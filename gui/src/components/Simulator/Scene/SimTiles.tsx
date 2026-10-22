import SimTile from "../Tile/SimTile.tsx";
import {useGrid} from "../../../hooks/useGrid.ts";

const SimTiles = () => {
  const { sizeX, sizeZ } = useGrid();
  return (
    <group position={[0, 0, 0]}>
      {Array.from({length: sizeX}).map((_, x) =>
        Array.from({length: sizeZ}).map((_, z) => (
          <SimTile key={sizeZ * x + z}
                   index={sizeZ * x + z}
                   position={[-x + (Math.floor(sizeX / 2)), 0, -z + 2]}/>
        ))
      )}
    </group>
  );
};

export default SimTiles;