import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

const CamTab = () => {
  const { camMode, setCamMode } = useTaskConfig();

  const style = camMode ?
    ('bg-indigo-700 font-bold py-2') :
    ('bg-indigo-300 pt-2 pb-3.5 translate-y-1.5 ' +
      'hover:cursor-pointer hover:bg-indigo-500 hover:translate-y-0.5 transition');

  const switchToCam = () => {
    setCamMode(!camMode);
  }

  return (
    <li className={`${style} text-white-smoke-400 tab  hover:text-white`}
        onClick={switchToCam}>
      <label className="block cursor-pointer">
        Kamera
      </label>
    </li>
  );
};

export default CamTab;