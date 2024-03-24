import React from "react";

import Console from "../components/Console";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useMPCCoreKit } from "../services/mpcCoreKit";

function EnableMFA() {
  const { provider, enableMFA } = useMPCCoreKit();

  return (
    <main className="flex flex-col h-screen z-0">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {provider ? (
          <div className=" w-full h-full flex flex-1 flex-col bg-gray-50 items-center justify-flex-start overflow-scroll">
            <h1 className="w-11/12 px-4 pt-16 sm:px-6 lg:px-8 text-2xl font-bold text-center sm:text-3xl">
              Welcome to Web3Auth MPC Core Kit Playground
            </h1>
            <div className="py-16 w-11/12 ">
              <button
                className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                style={{ backgroundColor: "#0364ff" }}
                onClick={() => enableMFA()}
              >
                Enable MFA
              </button>
              <Console />
            </div>
          </div>
        ) : (
          <div className=" w-full h-full flex flex-1 flex-col bg-gray-50 items-center justify-center overflow-scroll p-4">
            <h1 className="text-2xl font-bold text-center sm:text-3xl">Welcome to Web3Auth MPC Core Kit Playground</h1>
            <p className="max-w-md mx-auto mt-4 text-center text-gray-500">Please connect to Web3Auth to get started.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default EnableMFA;
