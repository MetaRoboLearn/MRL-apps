import { useRef, useEffect, useState } from 'react';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame, useThree} from '@react-three/fiber';

const SimCamera = () => {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const { size } = useThree();
  const baseHeight = 6;
  const [debouncedSize, setDebouncedSize] = useState(size);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSize(size);
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [size]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    const aspect = debouncedSize.width / debouncedSize.height;
    const worldHeight = baseHeight;
    const worldWidth = worldHeight * aspect;

    camera.left = -worldWidth / 2;
    camera.right = worldWidth / 2;
    camera.top = worldHeight / 2;
    camera.bottom = -worldHeight / 2;
    camera.updateProjectionMatrix();
  }, [debouncedSize, baseHeight]);

  useFrame(() => {
    if (cameraRef.current) {
      cameraRef.current.updateProjectionMatrix();
    }
  });

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[9, 10, 10]}
      zoom={1}
      args={[]}/>
  );
};

export default SimCamera;