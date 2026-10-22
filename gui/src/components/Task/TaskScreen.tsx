import {useEffect} from 'react';
import {TextureLoader} from "three";
import {useGLTF} from "@react-three/drei";
import CodeScreen from "../CodeEditor/CodeScreen.tsx";
import SimScreen from "../Simulator/SimScreen.tsx";
import Footer from "../UI/Footer.tsx";

function AssetPreload() {
  useEffect(() => {
    const loader = new TextureLoader()
    loader.load('/textures/fountain.webp')
    loader.load('/textures/lake.webp')
  }, [])

  useGLTF('/models/Tree_big.glb')
  useGLTF('/models/Tree_medium.glb')
  useGLTF('/models/Tree_small.glb')

  return null
}

const TaskScreen = () => {
  return (
    <>
      <AssetPreload />
      <div className="flex-1 w-full flex min-h-0 h-180">
        <CodeScreen/>
        <SimScreen/>
      </div>
      <Footer/>
    </>
  );
};

export default TaskScreen;