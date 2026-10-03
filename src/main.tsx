// Bricolage with its optical-size axis: the floor wordmark is set at display
// sizes, where the optical cut is what keeps the counters open.
import '@fontsource-variable/bricolage-grotesque/opsz.css'
import '@fontsource/alegreya/400-italic.css'
import '@fontsource/alegreya/400.css'
import '@fontsource/alegreya/500-italic.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
