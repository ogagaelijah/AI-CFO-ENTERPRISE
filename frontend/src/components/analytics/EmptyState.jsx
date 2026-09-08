export default function EmptyState({ title, message, onRetry }) {
  return (
    <div className="mt-8 flex justify-center">
      <div className="w-full max-w-2xl bg-rose-50 border border-rose-100 rounded-2xl p-10 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-rose-700 mb-2">{title}</h2>
        <p className="text-rose-600 mb-6">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-6 py-2.5 rounded-lg transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}