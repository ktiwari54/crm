export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}