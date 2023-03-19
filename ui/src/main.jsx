import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';

import App from './App'
import {SessionProvider} from "./Session.jsx";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <BrowserRouter>
          <SessionProvider>
            <App />
          </SessionProvider>
      </BrowserRouter>
  </React.StrictMode>,
)
