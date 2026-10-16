// frontend/src/components/common/RoleBadge.jsx
// v1.0.0-prod — Small colored badge showing a user's role.

const ROLE_CONFIG = {
  OWNER:      { label: 'Owner',      tone: 'gold'   },
  ADMIN:      { label: 'Admin',      tone: 'blue'   },
  MANAGER:    { label: 'Manager',    tone: 'purple' },
  CASHIER:    { label: 'Cashier',    tone: 'green'  },
  ACCOUNTANT: { label: 'Accountant', tone: 'slate'  },
};

const TONE_CLASSES = {
  gold:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  blue:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  purple:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  green:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  slate:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
};

const RoleBadge = ({ role, size = 'sm', className = '' }) => {
  if (!role) return null;
  const config = ROLE_CONFIG[role] || { label: role, tone: 'slate' };
  const toneClass = TONE_CLASSES[config.tone];

  const sizeClass =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'md'
      ? 'text-xs px-2.5 py-1'
      : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${toneClass} ${sizeClass} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default RoleBadge;