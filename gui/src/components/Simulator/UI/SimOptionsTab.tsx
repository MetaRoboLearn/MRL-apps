import {useTaskConfig} from "../../../hooks/useTaskConfig.ts";

const SimOptionsTab = () => {
  const { editMode, setEditMode } = useTaskConfig();

  const style = editMode ?
    ('bg-tomato-500 font-bold py-2') :
    ('bg-tomato-300 pt-2 pb-3.5 translate-y-1.5 ' +
      'hover:cursor-pointer hover:bg-tomato-500 hover:translate-y-0.5 transition');

  const switchToEdit = () => {
    setEditMode(!editMode);
  }

  return (
    <li className={`${style} text-white-smoke-400 tab  hover:text-white`}
        onClick={switchToEdit}>
      <label className="block cursor-pointer">
        Postavke
      </label>
    </li>
  );
};

export default SimOptionsTab;