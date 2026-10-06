// frontend/src/hooks/useWriteGuard.js
// v1.0.0-prod — Single source of truth for "can this user write?"
//
// Wraps usePlan() and returns everything a modal needs to gate write actions:
//   canWrite      : boolean — true if writes are allowed
//   guardMessage  : string  — tooltip text for disabled buttons
//   reason        : 'ok' | 'read_only' | 'no_plan'
//
// Usage in any modal:
//   const { canWrite, guardMessage } = useWriteGuard();
//   <button disabled={!canWrite} title={guardMessage}>Save</button>

import { usePlan } from './usePlan';

const MESSAGES = {
  read_only: 'Your trial has ended. Upgrade to continue.',
  no_plan: 'No active subscription. Please choose a plan to continue.',
};

export const useWriteGuard = () => {
  const plan = usePlan();

  const isReadOnly = plan?.isReadOnly === true;
  const hasPlan = Boolean(plan?.planId);

  const canWrite = !isReadOnly && hasPlan;
  const reason = isReadOnly ? 'read_only' : !hasPlan ? 'no_plan' : 'ok';

  return {
    canWrite,
    reason,
    guardMessage: canWrite ? '' : (MESSAGES[reason] || MESSAGES.read_only),
    planName: plan?.planName || null,
    isReadOnly,
  };
};

export default useWriteGuard;