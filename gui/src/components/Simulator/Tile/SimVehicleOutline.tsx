import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

const degToRad = (deg: number) => deg * Math.PI / 180;

const SimVehicleOutline = () => {
  const { selectedRotation, modelPath, modelsConfig } = useTaskConfig();

  const DEFAULT_PATH = '/models/Car.glb';
  const activePath = modelPath ?? modelsConfig?.default_path ?? DEFAULT_PATH;
  const modelEntry = modelsConfig?.models.find(m => m.path === activePath);
  const offset = modelEntry?.offset ?? { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [0.14, 0.16, 0.16] as [number, number, number] };

  const { scene } = useGLTF(activePath);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m) => m?.clone());
        } else if (mesh.material) {
          mesh.material = mesh.material.clone();
        }

        const mat = mesh.material;
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          mat.transparent = true;
          mat.opacity = 0.4;
          mat.side = THREE.DoubleSide;
          // Keep depthWrite = true to avoid z-fighting artifacts
          mat.depthWrite = true;
          // mat.color = new THREE.Color(0x00ffff);
          mat.color = new THREE.Color('red');
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <primitive
      object={clonedScene}
      position={[offset.position[0], offset.position[1] + 0.1, offset.position[2]]}
      rotation={[offset.rotation[0], -Math.PI / 2 + offset.rotation[1] + degToRad(selectedRotation), offset.rotation[2]]}
      scale={offset.scale}
    />
  );
};

export default SimVehicleOutline;
