import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { seed } from './db/schema.js'
import './index.css'
import { SettingsProvider } from './settings.jsx'
import { theme } from './theme.js'

// Fills in the default plans and prices the first time the app is opened on a
// device. Nothing here talks to a network.
await seed()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="bottom-center" limit={1} autoClose={3500} />
      <ModalsProvider>
        <BrowserRouter>
          <SettingsProvider>
            <App />
          </SettingsProvider>
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
)
