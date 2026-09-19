import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth.jsx'
import { Customer } from './pages/Customer.jsx'
import { Home } from './pages/Home.jsx'
import { Login } from './pages/Login.jsx'
import { NewCustomer } from './pages/NewCustomer.jsx'
import { SettingsProvider } from './settings.jsx'

function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/customers/new" element={<RequireAuth><NewCustomer /></RequireAuth>} />
        <Route path="/customers/:id" element={<RequireAuth><Customer /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SettingsProvider>
  )
}

export default App
