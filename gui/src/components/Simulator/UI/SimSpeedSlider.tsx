import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

const SimSpeedSlider = () => {
  const { animationSpeed, setAnimationSpeed } = useTaskConfig();

  return (
    <div className="flex-center mb-2 font-bold">
      <label className="text-md text-dark-neutrals-400 mr-4 whitespace-nowrap">
        Brzina
      </label>
      <input
        id="steps-range"
        type="range"
        min="20"
        max="100"
        step="10"
        value={animationSpeed * 1000}
        onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
        className="w-30 h-2 rounded-lg appearance-none bg-gray-300 accent-tomato-600 cursor-pointer"
      />
    </div>
  );
};

export default SimSpeedSlider;
