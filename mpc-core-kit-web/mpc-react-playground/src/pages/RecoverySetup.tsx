import React, { useState } from "react";

import Console from "../components/Console";
import Form from "../components/Form";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Tabs from "../components/Tabs";
import { useMPCCoreKit } from "../services/mpcCoreKit";

function RecoverySetup() {
  const { provider, criticalResetAccount, setupSmsRecovery, setupEmailPasswordlessRecovery, setupAuthenticatorRecovery, setupPasskeyRecovery } =
    useMPCCoreKit();

  const [number, setNumber] = useState("+82-123-456-7890");
  const [email, setEmail] = useState("hello@web3auth.com");
  const [tab, setTab] = useState("starkex");

  const formDetailsSms = [
    {
      label: "Phone Number",
      input: number as string,
      onChange: setNumber,
    },
  ];

  const formDetailsEmail = [
    {
      label: "Email Address",
      input: email as string,
      onChange: setEmail,
    },
  ];

  const formDetailsPasskey = [
    {
      label: "Email Address",
      input: email as string,
      onChange: setEmail,
    },
  ];

  const TabData = [
    {
      tabName: "SMS OTP",
      onClick: () => setTab("sms"),
      active: tab === "sms",
    },
    {
      tabName: "Authenticator",
      onClick: () => setTab("authenticator"),
      active: tab === "authenticator",
    },
    {
      tabName: "Email passwordless",
      onClick: () => setTab("email"),
      active: tab === "email",
    },
    {
      tabName: "PassKey",
      onClick: () => setTab("passkey"),
      active: tab === "passkey",
    },
  ];

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
              <Tabs tabData={TabData} />
              {(() => {
                switch (tab) {
                  case "sms":
                    return (
                      <Form formDetails={formDetailsSms}>
                        <button
                          className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                          style={{ backgroundColor: "#0364ff" }}
                          onClick={() => setupSmsRecovery(number)}
                        >
                          Setup SMS OTP recovery
                        </button>
                      </Form>
                    );
                  case "authenticator":
                    return (
                      <button
                        className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                        style={{ backgroundColor: "#0364ff" }}
                        onClick={() => setupAuthenticatorRecovery()}
                      >
                        Setup Authenticator recovery
                      </button>
                    );

                  case "email":
                    return (
                      <Form formDetails={formDetailsEmail}>
                        <button
                          className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                          style={{ backgroundColor: "#0364ff" }}
                          onClick={() => setupEmailPasswordlessRecovery(email)}
                        >
                          Setup Email Passwordless recovery
                        </button>
                      </Form>
                    );

                  case "passkey":
                    return (
                      <Form formDetails={formDetailsPasskey}>
                        <button
                          className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                          style={{ backgroundColor: "#0364ff" }}
                          onClick={() => setupPasskeyRecovery(email)}
                        >
                          Setup Passkey recovery
                        </button>
                      </Form>
                    );

                  default:
                    return (
                      <Form formDetails={formDetailsSms}>
                        <button
                          className="w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                          style={{ backgroundColor: "#0364ff" }}
                          onClick={() => setupSmsRecovery(number)}
                        >
                          Setup SMS OTP recovery
                        </button>
                      </Form>
                    );
                }
              })()}

              <button
                className=" w-full mt-10 mb-0 text-center justify-center items-center flex rounded-full px-6 py-3 text-white"
                style={{ backgroundColor: "#0364ff" }}
                onClick={() => criticalResetAccount()}
              >
                CRITICAL: Reset Account
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

export default RecoverySetup;
