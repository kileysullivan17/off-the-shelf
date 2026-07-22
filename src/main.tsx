import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthGate } from './components/AuthGate'
import { createDataStore, StoreProvider } from './lib/store'
import './index.css'

const store = createDataStore()
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <StoreProvider store={store}>
        <AuthGate>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthGate>
      </StoreProvider>
    </QueryClientProvider>
  </StrictMode>,
)
