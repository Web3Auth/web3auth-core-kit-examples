import "./App.css";

import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Contract from "./pages/Contract";
import HomePage from "./pages/HomePage";
// import ServerSideVerification from "./pages/ServerSideVerification";
import Transaction from "./pages/Transaction";
import { Web3AuthProvider } from "./services/web3auth";

function App(): React.JSX.Element {
  return (
    <div>
      <Web3AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/">
              <Route index element={<HomePage />} />
              <Route path="contract" element={<Contract />} />
              <Route path="transaction" element={<Transaction />} />
              {/* <Route path="server-side-verification" element={<ServerSideVerification />} /> */}
            </Route>
          </Routes>
        </BrowserRouter>
      </Web3AuthProvider>
    </div>
  );
}

export default App;
