import {useUI} from "../../hooks/useUI.ts";
import {useState} from "react";

const GroupNameForm = () => {
  const { setModalVisible } = useUI();

  const [newName, setNewName] = useState<string>('');

  const set = () =>{
    localStorage.setItem('group', newName);
  }

  return (
    <>
      <div className={'flex flex-col mb-3'}>
        <label className={'mr-5 text-lg'}>Naziv grupe</label>
        <input type='text'
               placeholder={'Unesite oznaku'}
               value={newName}
               onChange={(e) => setNewName(e.target.value)}
               className={'modal-form-input'}/>
      </div>

      <div className={'text-lg pt-8 text-right'}>
        <span
          className={'modal-form-button mr-3'}
          onClick={() => {
            setModalVisible(false);
            set();
          }}>Spremi
        </span>
        <span
          className={'modal-form-button'}
          onClick={() => {
            setModalVisible(false);
          }}>Odustani
        </span>
      </div>
    </>
  );
};

export default GroupNameForm;