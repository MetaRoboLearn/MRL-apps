import LogoWhite from '/logo_white_notext.svg'
import {Link} from "@tanstack/react-router";
import {useAuth} from "../../hooks/useAuth.ts";
import {FaHouse} from "react-icons/fa6";
import {FaUser, FaDownload} from "react-icons/fa";
import {useState} from "react";
import {downloadDbDump} from "../../api/adminApi.ts";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [dumping, setDumping] = useState(false);

  const handleDbDump = async () => {
    setDumping(true);
    try {
      await downloadDbDump();
    } catch (e) {
      console.error(e);
    } finally {
      setDumping(false);
    }
  };

  return (
    <div className="bg-turquoise-500 px-2 w-full h-20 z-50 flex items-center justify-between">
      <div className={'flex items-center'}>
        <img src={LogoWhite} alt={'logo-white'} className={'p-1 h-full'}/>
        <h1 className={'text-light-cyan-200 ml-4 font-display font-bold text-xl'}>MetaRoboLearn</h1>
        <Link to="/" className="ml-6 flex items-center gap-2 px-3 py-1.5 text-sm font-display font-semibold text-light-cyan-200 bg-turquoise-600 rounded hover:bg-turquoise-700 transition">
          <FaHouse size={14} />
          Početna stranica
        </Link>
        <Link to="/profile" className="ml-2 flex items-center gap-2 px-3 py-1.5 text-sm font-display font-semibold text-light-cyan-200 bg-turquoise-600 rounded hover:bg-turquoise-700 transition">
          <FaUser size={14} />
          Profil
        </Link>
      </div>
      <div className="flex items-center gap-3 pr-4 font-display">
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <div className="p-2 flex gap-2">
            <Link to="/" className="[&.active]:font-bold">
              Home
            </Link>
            <Link to="/admin/users" className="[&.active]:font-bold">
              Users
            </Link>
            <Link to="/admin/badges" className="[&.active]:font-bold">
              Badges
            </Link>
            <Link to="/admin/activities" className="[&.active]:font-bold">
              Activities
            </Link>
            <Link to="/admin/tasks" className="[&.active]:font-bold">
              Tasks
            </Link>
            <Link to="/admin/robots" className="[&.active]:font-bold">
              Robots
            </Link>
          </div>
        )}
        {user?.role === 'admin' && (
          <button
            onClick={handleDbDump}
            disabled={dumping}
            title="Download DB dump"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-turquoise-600 text-light-cyan-200 rounded hover:bg-turquoise-700 transition disabled:opacity-50"
          >
            <FaDownload size={13} />
            {dumping ? 'Downloading…' : 'DB Dump'}
          </button>
        )}
        {user && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-bold text-light-cyan-100">
                {user.first_name} {user.last_name}
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full bg-sunglow-500 text-dark-neutrals-500">
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm bg-turquoise-600 text-light-cyan-200 rounded hover:bg-turquoise-700 transition"
            >
              Odjavi se
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;