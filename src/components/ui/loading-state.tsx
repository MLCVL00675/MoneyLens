import { BarLoader } from "react-spinners";

export function LoadingState({
  title = "Loading...",
  message = "Please wait a moment while we fetch your financial data.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3 animate-fade-in text-center px-4">
      {/* Progress Bar */}
      <BarLoader color="#D4A843" width={180} height={3} className="rounded-full overflow-hidden" />

      {/* Text Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-800 font-serif">{title}</h3>
        <p className="text-xs text-gray-500 max-w-xs">{message}</p>
      </div>
    </div>
  );
}
