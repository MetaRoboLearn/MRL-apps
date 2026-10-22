import {useUI} from "../../../hooks/useUI.ts";
import SimCreateForm from "../../Forms/SimCreateForm.tsx";
import {useVehicle} from "../../../hooks/useVehicle.ts";

const SimCreate = () => {
  const { modalVisible, showModal } = useUI();
  const { isMoving } = useVehicle();

  return (
    <div className={`text-dark-neutrals-400 font-bold text-3xl px-1 mx-3 mb-1 select-none transition
         ${isMoving || modalVisible ? '' : 'hover:cursor-pointer hover:text-dark-neutrals-800 hover:scale-110'}`}
         onClick={() => {
           showModal(
             'Stvaranje simulacije',
             <SimCreateForm />
           )
         }}>+</div>
  );
};

export default SimCreate;