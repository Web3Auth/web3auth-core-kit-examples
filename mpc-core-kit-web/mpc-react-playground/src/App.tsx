import "./App.css";

import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import BlockchainCall from "./pages/BlockchainCall";
import EnableMFA from "./pages/EnableMFA";
import HomePage from "./pages/HomePage";
import Recover from "./pages/Recover";
import RecoverySetup from "./pages/RecoverySetup";
import { MPCCoreKitProvider } from "./services/mpcCoreKit";

function App() {
  return (
    <div>
      <MPCCoreKitProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/">
              <Route index element={<HomePage />} />
              <Route path="enablemfa" element={<EnableMFA />} />
              <Route path="recover" element={<Recover />} />
              <Route path="recoverysetup" element={<RecoverySetup />} />
              <Route path="blockchaincalls" element={<BlockchainCall />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MPCCoreKitProvider>
    </div>
  );
}

export default App;
