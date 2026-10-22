import {FaStop} from "react-icons/fa";
import {useVehicle} from "../../hooks/useVehicle.ts";

const ButtonSimStop = ({disabled}: {disabled: boolean}) => {
  const { reset } = useVehicle();

  return (
    <button disabled={disabled}
            className={`bg-tomato-500 text-light-cyan-200 button-lg ml-8
                    ${disabled ? 'bg-tomato-700 text-light-cyan-700' : 'hover:cursor-pointer hover:bg-tomato-600'} transition`}
            onClick={reset}>
      <FaStop size={18}/>
      <span className={'ml-4'}>Zaustavi</span>
    </button>
  );
};

export default ButtonSimStop;