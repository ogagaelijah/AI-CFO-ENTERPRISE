// frontend/src/components/subscription/ReadOnlyBanner.jsx
// v1.0.0-prod — Top-of-page read-only banner (post-trial)

import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ReadOnlyBanner = () => {
    return (
        <div className="flex items-start sm:items-center gap-3 px-4 py-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Your trial has ended</p>
                <p className="text-xs mt-0.5">
                    Your account is now in read-only mode. You can view existing data but cannot add new records or access intelligence features.
                </p>
            </div>
            <Link
                to="/subscription"
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition whitespace-nowrap"
            >
                Upgrade
            </Link>
        </div>
    );
};

export default ReadOnlyBanner;