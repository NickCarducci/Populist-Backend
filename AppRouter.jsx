import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import VerificationComplete from './VerificationComplete';
import BillShare from './BillShare';
import RepresentativeShare from './RepresentativeShare';

/**
 * Main router component that wraps the entire application
 * Handles client-side routing for:
 * - Didit verification callback
 * - Shareable bill links with iOS deep linking
 * - Shareable representative profile links with iOS deep linking
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verification-complete" element={<VerificationComplete />} />
        <Route path="/bill/:billId" element={<BillShare />} />
        <Route path="/representative/:bioguideId" element={<RepresentativeShare />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
