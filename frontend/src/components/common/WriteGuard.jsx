// frontend/src/components/common/WriteGuard.jsx
// v1.0.0-prod — Wrapper that renders its children only if writes are
//               allowed; otherwise renders an optional fallback.
//
// Usage:
//   <WriteGuard>
//     <button onClick={save}>Save</button>
//   </WriteGuard>
//
//   <WriteGuard fallback={<span>Upgrade to continue</span>}>
//     <button onClick={save}>Save</button>
//   </WriteGuard>

import { useWriteGuard } from '../../hooks/useWriteGuard';

const WriteGuard = ({ children, fallback = null }) => {
  const { canWrite } = useWriteGuard();
  return canWrite ? children : fallback;
};

export default WriteGuard;