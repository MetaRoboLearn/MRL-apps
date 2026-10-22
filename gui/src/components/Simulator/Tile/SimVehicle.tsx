import {useGLTF} from "@react-three/drei";
import {useEffect, useRef} from "react";
import {useVehicle} from "../../../hooks/useVehicle.ts";
import {MoveCommand, Position, Rotation} from "../../../types.ts";
import * as THREE from 'three';
import {Euler, Vector3} from "three";
import {useFrame} from "@react-three/fiber";
import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";
import {useUI} from "../../../hooks/useUI.ts";
import {createLog, EventTypes} from "../../../api/logApi.ts";
import {useCode} from "../../../hooks/useCode.ts";
import {useConsole} from "../../../hooks/useConsole.ts";
import {useGrid} from "../../../hooks/useGrid.ts";

const SimVehicle = () => {
  const { getCurrentValue } = useCode();
  const { finish } = useGrid();
  const { vehicleRef, startPosition, startRotation, position, rotation, isMoving, moveQueue, reset,
    setPosition, setRotation, setIsMoving, queueMoves, setCurrentMove, simFinished } = useVehicle();
  const { animationSpeed, ustId } = useTaskConfig();
  const { setModalVisible, setModalHeader, setModalBody, setModalFooter } = useUI();
  const { addLog, clearLogs } = useConsole();

  const currentMoveRef = useRef<MoveCommand | null>(null);
  const targetPos = useRef<Vector3>(new Vector3(position.x, position.y, position.z));
  const targetRot = useRef<Euler>(new Euler(rotation.x, rotation.y, rotation.z));
  const isSleeping = useRef<boolean>(false);
  const moveQueueRef = useRef<MoveCommand[]>(moveQueue);

  // Keep ref in sync with state
  useEffect(() => {
    moveQueueRef.current = moveQueue;
  }, [moveQueue]);

  const showModalWindow = (type: string) => {
    const val = getCurrentValue();
    if (type === 'succ'){
      void createLog(ustId, EventTypes.SIM_END_SUCC, val);
      setModalHeader('Čestitke!');
      setModalBody('Uspješno ste uputili vozilo do cilja, svaka čast!');
    }
    else if (type === 'fail'){
      void createLog(ustId, EventTypes.SIM_END_FAIL, val);
      setModalHeader('Uuuups!');
      setModalBody('Niste stigli do kraja, pokušajte ponovno!');
    }
    else if (type === 'stuck'){
      void createLog(ustId, EventTypes.SIM_END_FAIL, val);
      setModalHeader('Uuuups!');
      setModalBody('Negdje ste zapeli na putu, pokušajte ponovno!');
    }
    setModalFooter(
      <span
        className={'bg-sunglow-600/70 px-4 py-2 rounded font-semibold transition hover:cursor-pointer hover:bg-sunglow-600'}
        onClick={() => {
          reset();
          setModalVisible(false);
        }}>Povratak</span>
    )
    setModalVisible(true);
  }

  useEffect(() => {
    targetPos.current = new Vector3(position.x, position.y, position.z);
  }, [position]);

  useEffect(() => {
    targetRot.current = new Euler(rotation.x, rotation.y, rotation.z);
  }, [rotation]);

  useFrame(() => {
    if (!vehicleRef.current || !isMoving || isSleeping.current) return;

    const positionCloseEnough = vehicleRef.current.position.distanceTo(targetPos.current) < 0.01;
    const targetQuat = new THREE.Quaternion().setFromEuler(targetRot.current);
    const rotationCloseEnough = vehicleRef.current.quaternion.angleTo(targetQuat) < 0.01;

    if (positionCloseEnough && rotationCloseEnough) {
      const queue = moveQueueRef.current;

      if (queue.length === 0) {
        setIsMoving(false);
        setCurrentMove(null);
        if (finish !== null) {
          if (simFinished) {
            showModalWindow('succ');
          } else {
            showModalWindow('fail');
          }
        }
        return;
      }

      const nextMove = queue[0];
      const remaining = queue.slice(1);

      // Update ref immediately so next frame sees the change
      moveQueueRef.current = remaining;

      // Handle non-animation steps immediately
      if (nextMove.type === 'print') {
        addLog("OUTPUT", nextMove.value || '');
        queueMoves(remaining);
        return;
      }

      if (nextMove.type === 'display') {
        addLog("DISPLAY", nextMove.value || '');
        queueMoves(remaining);
        return;
      }

      if (nextMove.type === 'display_clear') {
        clearLogs();
        queueMoves(remaining);
        return;
      }

      if (nextMove.type === 'sleep') {
        isSleeping.current = true;
        queueMoves(remaining);
        setTimeout(() => {
          isSleeping.current = false;
        }, Number(nextMove.value ?? 1) * 1000);
        return;
      }

      if (nextMove.type === 'detect') {
        queueMoves(remaining);
        return;
      }

      if (nextMove.type === 'move' && nextMove.blocked) {
        setIsMoving(false);
        setCurrentMove(null);
        showModalWindow('stuck');
        return;
      }

      // Movement and rotation
      currentMoveRef.current = nextMove;

      if (nextMove.type === 'move' && nextMove.direction) {
        const moveDirection = new Vector3(0, 0, 0);
        if (nextMove.direction === 'forward') {
          moveDirection.x = -1;
        } else if (nextMove.direction === 'backward') {
          moveDirection.x = 1;
        }

        moveDirection.applyEuler(vehicleRef.current.rotation);

        const newPos: Position = {
          x: position.x + Math.round(moveDirection.x),
          y: position.y,
          z: position.z + Math.round(moveDirection.z),
        };

        targetPos.current.set(newPos.x, newPos.y, newPos.z);
        setPosition(newPos);
      } else if (nextMove.type === 'rotate' && nextMove.direction) {
        const newRot: Rotation = { ...rotation };
        if (nextMove.direction === 'left') {
          newRot.y += Math.PI / 2;
        } else if (nextMove.direction === 'right') {
          newRot.y -= Math.PI / 2;
        }

        targetRot.current.set(newRot.x, newRot.y, newRot.z);
        setRotation(newRot);
      }

      queueMoves(remaining);
    }

    if (currentMoveRef.current?.type === 'move') {
      vehicleRef.current.position.lerp(targetPos.current, animationSpeed);
    } else if (currentMoveRef.current?.type === 'rotate') {
      vehicleRef.current.quaternion.slerp(
        new THREE.Quaternion().setFromEuler(targetRot.current),
        animationSpeed
      );
    }
  });

  const { modelPath, modelsConfig } = useTaskConfig();

  const DEFAULT_PATH = '/models/Car.glb';
  const activePath = modelPath ?? modelsConfig?.default_path ?? DEFAULT_PATH;
  const modelEntry = modelsConfig?.models.find(m => m.path === activePath);
  const offset = modelEntry?.offset ?? { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [0.14, 0.16, 0.16] as [number, number, number] };

  const { scene } = useGLTF(activePath);
  useEffect(() => {
    scene.traverse((child) => {
      if ('isMesh' in child && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group ref={vehicleRef}
           position={[startPosition.x, startPosition.y, startPosition.z]}
           rotation={[startRotation.x, startRotation.y, startRotation.z]}>
      <primitive object={scene}
                 position={offset.position}
                 rotation={offset.rotation}
                 scale={offset.scale} />
    </group>
  );
};

export default SimVehicle;