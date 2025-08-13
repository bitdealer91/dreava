import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import ReownProvider from './providers/ReownProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 30000,
      gcTime: 300000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReownProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ReownProvider>
  </React.StrictMode>
);
