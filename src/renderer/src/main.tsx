import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { GeminiProvider } from './context/GeminiContext'
import { Provider } from 'react-redux'
import { store } from './store'
import './assets/tailwind.css'
import './assets/main.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <GeminiProvider>
        <App />
      </GeminiProvider>
    </Provider>
  </React.StrictMode>
)
