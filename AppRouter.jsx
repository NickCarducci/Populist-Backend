import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import VerificationComplete from './VerificationComplete';
import BillShare from './BillShare';

/**
 * Main router component that wraps the entire application
 * Handles client-side routing for:
 * - Didit verification callback
 * - Shareable bill links with iOS deep linking
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verification-complete" element={<VerificationComplete />} />
        <Route path="/bill/:billId" element={<BillShare />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
