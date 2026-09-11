// frontend/src/components/subscription/TrialBanner.jsx
// v1.0.0-prod — Top-of-page trial countdown banner

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const TrialBanner = ({ daysRemaining = 0, planName = 'Pro' }) => {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed || daysRemaining <= 0) return null;

    const urgent = daysRemaining <= 3;

    return (
        <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
                urgent
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-gold-300'
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">
                    <span className="font-semibold">{daysRemaining} day{daysRemaining === 1 ? '' : 's'} left</span>
                    {' '}on your {planName} trial.{' '}
                    <Link to="/subscription" className="underline font-medium">
                        Upgrade now
                    </Link>
                </p>
            </div>
            <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default TrialBanner;