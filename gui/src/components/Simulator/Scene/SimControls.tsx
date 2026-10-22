import { useEffect, useRef, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGrid } from '../../../hooks/useGrid.ts';

const SimControls = () => {
  const { sizeX, sizeZ } = useGrid();
  const { camera, scene } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const [minPan, setMinPan] = useState<THREE.Vector3>(new THREE.Vector3());
  const [maxPan, setMaxPan] = useState<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    const offsetX = Math.floor(sizeX / 2);
    const offsetZ = 2;
    const positions: THREE.Vector3[] = [];

    for (let x = 0; x < sizeX; x++) {
      for (let z = 0; z < sizeZ; z++) {
        const pos = new THREE.Vector3(-x + offsetX, 0, -z + offsetZ);
        positions.push(pos);
      }
    }

    const box = new THREE.Box3().setFromPoints(positions);
    const min = box.min.clone();
    const max = box.max.clone();

    min.y = -3;
    max.y = 3;

    setMinPan(min);
    setMaxPan(max);
  }, [sizeX, sizeZ]);


  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    controls.object.position.set(9, 10, 10);
    controls.target.set(0, 0, 0);
    controls.object.zoom = 1;
    controls.object.updateProjectionMatrix();
    controls.update();
  }, [sizeX, sizeZ]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const _v = new THREE.Vector3();

    const handleChange = () => {
      _v.copy(controls.target);
      controls.target.clamp(minPan, maxPan);
      _v.sub(controls.target);
      camera.position.sub(_v);
    };

    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [camera, minPan, maxPan]);

  useEffect(() => {
    const box = new THREE.Box3(minPan.clone(), maxPan.clone());
    const helper = new THREE.Box3Helper(box, 0xffff00);
    //scene.add(helper);

    return () => {
      scene.remove(helper);
    };
  }, [scene, minPan, maxPan]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false}
      enablePan={true}
      enableZoom={true}
      minZoom={0.5}
      maxZoom={2}
    />
  );
};

export default SimControls;
