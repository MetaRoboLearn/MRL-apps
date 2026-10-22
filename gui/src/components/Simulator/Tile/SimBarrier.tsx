import SimTree from "./SimTree.tsx";
import {Barrier} from "../../../types.ts";
import SimFountain from "./SimFountain.tsx";
import SimLake from "./SimLake.tsx";

interface Props {
  barrier: Barrier | undefined;
}

const SimBarrier = ({ barrier } : Props) => {
  if (barrier === Barrier.TREES)
    return <SimTree />
  if (barrier === Barrier.FOUNTAIN)
    return <SimFountain />
  if (barrier === Barrier.LAKE)
    return <SimLake />
  else
    return null
};

export default SimBarrier;
