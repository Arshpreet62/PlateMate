import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { requestPersistence, seed } from './db/schema.js'
import './index.css'
import { theme } from './theme.js'

// Plain markup, no React and no Mantine: this has to render even when the
// reason the app failed is that nothing else could start. Without it a device
// that refuses storage just shows a white screen, and there is no server and
// nobody to ask.
function showStorageFailure(error) {
  document.getElementById('root').innerHTML = `
    <div style="font-family: system-ui, sans-serif; max-width: 30rem; margin: 15vh auto; padding: 0 1.5rem; color: #0f172a">
      <h1 style="font-size: 1.4rem; margin-bottom: .75rem">PlateMate can't open its storage</h1>
      <p style="line-height: 1.6; color: #475569">
        This app keeps everything on this device, and the browser is not letting it.
        Your customers are not lost — the app just can't reach them right now.
      </p>
      <p style="line-height: 1.6; color: #475569">Usually one of these fixes it:</p>
      <ul style="line-height: 1.8; color: #475569">
        <li>Turn off Private / Incognito browsing and open the app again.</li>
        <li>Allow site data for this page in the browser's settings.</li>
        <li>Free up some space on the phone, then reload.</li>
      </ul>
      <p style="color: #94a3b8; font-size: .85rem; margin-top: 2rem">${String(error?.message ?? error)}</p>
    </div>`
}

try {
  // Fills in the default plans the first time the app is opened on
  // a device. Nothing here talks to a network.
  await seed()
} catch (error) {
  showStorageFailure(error)
  throw error
}

// Deliberately not awaited: whether the browser grants persistence or not, the
// counter still has to open.
requestPersistence()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="bottom-center" limit={1} autoClose={3500} />
      <ModalsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
)
