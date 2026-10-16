// frontend/src/components/common/UserMenu.jsx
// v1.0.0-prod — Top-right user menu with role badge, name, and dropdown.
//               Shows role inline so the user always knows their access level.

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from './RoleBadge';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const displayName = user.fullName || user.email || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'U';

  const canAccessSettings = ['OWNER', 'ADMIN'].includes(user.role);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-primary-600 dark:bg-gold-500 flex items-center justify-center text-white dark:text-slate-900 text-xs font-bold">
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
            {displayName}
          </span>
          <RoleBadge role={user.role} size="xs" />
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <RoleBadge role={user.role} size="xs" />
              {user.businessName && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  · {user.businessName}
                </span>
              )}
            </div>
          </div>

          {canAccessSettings && (
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              role="menuitem"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition border-t border-gray-200 dark:border-slate-700"
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;