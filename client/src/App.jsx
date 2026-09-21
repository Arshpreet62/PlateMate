import { Center, Loader } from '@mantine/core'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Customer } from './pages/Customer.jsx'
import { CustomerList } from './pages/CustomerList.jsx'
import { MenuPage } from './pages/MenuPage.jsx'
import { NewCustomer } from './pages/NewCustomer.jsx'
import { Plans } from './pages/Plans.jsx'

const Scan = lazy(() => import('./pages/Scan.jsx').then((m) => ({ default: m.Scan })))

function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/customers/new" element={<NewCustomer />} />
      <Route path="/customers/:id" element={<Customer />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/menu/plans" element={<Plans />} />
      <Route
        path="/scan"
        element={
          <Suspense fallback={<Center h="60vh"><Loader /></Center>}>
            <Scan />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
