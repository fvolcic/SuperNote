import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './ui/App'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/notes/new" replace />} />
        <Route path="/notes/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)

