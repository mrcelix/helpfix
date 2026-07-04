import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { LangProvider } from './contexts/LangContext'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>,
)
