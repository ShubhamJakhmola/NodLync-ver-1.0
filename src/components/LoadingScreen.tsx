interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background text-slate-100">
    <div className="glass-panel px-6 py-4 flex items-center gap-3 shadow-lg">
      <div className="h-3 w-3 animate-ping rounded-full bg-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  </div>
);

export default LoadingScreen;
