import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import VerificationComplete from './VerificationComplete';

/**
 * Main router component that wraps the entire application
 * Handles client-side routing for Didit verification callback
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verification-complete" element={<VerificationComplete />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
