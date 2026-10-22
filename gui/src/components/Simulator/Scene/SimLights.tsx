const SimLights = () => {
  return (
    <>
      <ambientLight intensity={0.8}/>
      <directionalLight color="white"
                        castShadow={true}
                        position={[2, 10, 7]}
                        intensity={2.8}
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                        shadow-camera-left={-10}
                        shadow-camera-right={10}
                        shadow-camera-top={10}
                        shadow-camera-bottom={-10}/>
    </>
  );
};

export default SimLights;