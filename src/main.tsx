import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import "./styles.css";

const queryClient = new QueryClient();

const container = document.getElementById("root");
if (!container) throw new Error('Root container "#root" was not found in index.html');

createRoot(container).render(
  <StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
