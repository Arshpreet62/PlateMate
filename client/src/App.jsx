import { Center, Loader } from '@mantine/core'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth.jsx'
import { Customer } from './pages/Customer.jsx'
import { Home } from './pages/Home.jsx'
import { Login } from './pages/Login.jsx'
import { MenuPage } from './pages/MenuPage.jsx'
import { NewCustomer } from './pages/NewCustomer.jsx'
import { SettingsProvider } from './settings.jsx'

const Scan = lazy(() => import('./pages/Scan.jsx').then((m) => ({ default: m.Scan })))

function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/customers/new" element={<RequireAuth><NewCustomer /></RequireAuth>} />
        <Route path="/menu" element={<RequireAuth><MenuPage /></RequireAuth>} />
        <Route path="/customers/:id" element={<RequireAuth><Customer /></RequireAuth>} />
        <Route
          path="/scan"
          element={
            <RequireAuth>
              <Suspense fallback={<Center h="60vh"><Loader /></Center>}>
                <Scan />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  )
}

export default App
