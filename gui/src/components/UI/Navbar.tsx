import LogoWhite from '/logo_white_notext.svg'
import {Link, useLocation} from "@tanstack/react-router";
import {useAuth} from "../../hooks/useAuth.ts";
import {FaHouse} from "react-icons/fa6";
import {FaUser} from "react-icons/fa";
import {useDropdown} from "../../hooks/useDropdown.ts";

const Navbar = () => {
  const { user, logout } = useAuth();
  const {dropdownRef, isOpen, toggle, close} = useDropdown<HTMLDivElement>();
  const location = useLocation();
  const isUsersRoute = location.pathname === '/admin/users' || location.pathname === '/admin/users/';
  const roleLabel = user?.role === 'admin'
    ? 'Administrator'
    : user?.role === 'teacher'
      ? 'Nastavnik'
      : 'Učenik';

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
              Početna
            </Link>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={toggle}
                className="flex items-center gap-2 cursor-pointer [&.active]:font-bold"
              >
                Upravljanje korisnicima
              </button>
              {isOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-44 bg-turquoise-600 rounded shadow-lg p-2 z-50">
                <Link
                  to="/admin/users"
                  className={`block px-3 py-2 rounded hover:bg-turquoise-700 ${isUsersRoute ? 'font-bold' : ''}`}
                  onClick={close}
                >
                  Korisnici
                </Link>
                <Link
                  to="/admin/users/groups"
                  className="block px-3 py-2 rounded hover:bg-turquoise-700 [&.active]:font-bold"
                  onClick={close}
                >
                  Grupe
                </Link>
                </div>
              )}
            </div>
            <Link to="/admin/badges" className="[&.active]:font-bold">
              Značke
            </Link>
            <Link to="/admin/activities" className="[&.active]:font-bold">
              Aktivnosti
            </Link>
            <Link to="/admin/analytics" className="[&.active]:font-bold">
              Analitika
            </Link>
            <Link to="/admin/tasks" className="[&.active]:font-bold">
              Zadaci
            </Link>
            <Link to="/admin/robots" className="[&.active]:font-bold">
              Roboti
            </Link>
          </div>
        )}
        {/*
        {user?.role === 'admin' && (
          <button
            onClick={handleDbDump}
            disabled={dumping}
            title="Preuzmi sigurnosnu kopiju baze"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-turquoise-600 text-light-cyan-200 rounded hover:bg-turquoise-700 transition disabled:opacity-50"
          >
            <FaDownload size={13} />
            {dumping ? 'Preuzimanje…' : 'Sigurnosna kopija baze'}
          </button>
        )}
        */}
        {user && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-bold text-light-cyan-100">
                {user.first_name} {user.last_name}
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-full bg-sunglow-500 text-dark-neutrals-500">
                {roleLabel}
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