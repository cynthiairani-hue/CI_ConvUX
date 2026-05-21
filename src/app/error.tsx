"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h2 className="text-base font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[#394859] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D3A47]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
