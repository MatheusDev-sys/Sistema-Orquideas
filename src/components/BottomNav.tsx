import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const BottomNav: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50 safe-area-bottom">
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600" : "text-gray-400"
          )
        }
      >
        <Home size={24} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Início</span>
      </NavLink>

      <NavLink
        to="/logs"
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-1 transition-colors",
            isActive ? "text-emerald-600" : "text-gray-400"
          )
        }
      >
        <ClipboardList size={24} />
        <span className="text-[10px] font-medium uppercase tracking-wider">Logs</span>
      </NavLink>

      {profile?.is_admin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-emerald-600" : "text-gray-400"
            )
          }
        >
          <Settings size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Admin</span>
        </NavLink>
      )}
    </nav>
  );
};
