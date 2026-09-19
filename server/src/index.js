import { createApp } from './app.js'

const PORT = process.env.PORT || 3001

createApp().listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
