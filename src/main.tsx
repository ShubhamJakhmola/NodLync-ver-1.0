import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App.tsx";

// Apply persisted theme ASAP to avoid a dark->light flash before settings load.
try {
  const storedTheme = window.localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(storedTheme);
  }
} catch {
  // ignore
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchIntervalInBackground: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);
