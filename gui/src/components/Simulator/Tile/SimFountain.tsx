import {DoubleSide} from "three";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";
import {Barrier} from "../../../types.ts";

const SimFountain = () => {
  const { barrierTextures } = useTaskConfig();

  return (
    <group position={[0, -0.4, 0]}>
      <mesh position={[0, 0.525, 0]} scale={[0.8, 0.05, 0.8]} receiveShadow={true}>
        <boxGeometry/>
        <meshStandardMaterial color={'green'}/>
      </mesh>
      <mesh position={[0, 0.555, 0]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[0.7, 0.7, 0]}>
        <planeGeometry args={[1, 1]}/>
        <meshBasicMaterial map={barrierTextures[Barrier.FOUNTAIN]} transparent={true} side={DoubleSide}/>
      </mesh>
    </group>
  );
};

export default SimFountain;