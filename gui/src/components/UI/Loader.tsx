import {useState} from "react";
import LogoWhite from '/logo_white_notext.svg'

const Loader = () => {
  const [hide, setHide] = useState(false);

  const fade = () => {
    setTimeout(() => {
      setHide(true);
    }, 600)
  }

  fade();
  // TODO - check why the logo doesnt load instantly
  return (
    <div
      className={`fixed w-full h-full bg-turquoise-600 z-100 flex justify-center items-center ${hide ? 'opacity-0 pointer-events-none' : ''} transition ease-out duration-500`}>
      <img src={LogoWhite} alt={'logo-white'} className={'p-1 h-full w-30'}/>
      <h1 className={'text-light-cyan-200 ml-4 font-display font-bold text-3xl'}>MetaRoboLearn</h1>
    </div>
  );
};

export default Loader;
