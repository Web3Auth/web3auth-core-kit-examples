import React from "react";

import web3AuthLogoWhite from "../assets/web3authLogoWhite.svg";
import { useWeb3Auth } from "../services/web3auth";

const ConnectWeb3AuthButton = () => {
  const { provider, login, email, updateEmail, isWebAuthnLoginEnabled, isWebAuthnRegistrationEnabled, triggerPassKeyRegistration } = useWeb3Auth();
  const [loading, setLoading] = React.useState(false);

  const LoaderButton = ({ ...props }) => (
    <button {...props}>
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {props.children}
    </button>
  );

  if (provider) {
    return null;
  }
  return (
    <div className="px-4 sm:px-6 lg:px-8  z-0">
      <div className="md:p-8 p-4 mt-6 mb-0 space-y-4 rounded-lg bg-white overflow-hidden">
        <label className="text-lg text-gray-700 font-medium">Enter Your Email</label>
        <input
          type="email"
          id="email"
          className="w-full p-4 text-sm border-gray-200 rounded-lg shadow-sm rounded-full"
          value={email}
          onChange={(e) => {
            updateEmail(e.target.value as string);
          }}
        />
        {isWebAuthnRegistrationEnabled && (
          <LoaderButton
            className="flex flex-row w-full rounded-full px-6 py-3 text-white justify-center align-center"
            style={{ backgroundColor: "#0364ff" }}
            onClick={async () => {
              setLoading(true);
              try {
                await triggerPassKeyRegistration();
              } catch (e) {
                console.error(e);
              }
              setLoading(false);
            }}
          >
            Register Passkey
          </LoaderButton>
        )}
        {isWebAuthnLoginEnabled && (
          <LoaderButton
            className="flex flex-row w-full rounded-full px-6 py-3 text-white justify-center align-center"
            style={{ backgroundColor: "#0364ff" }}
            onClick={async () => {
              setLoading(true);
              try {
                await login();
              } catch (e) {
                console.error(e);
              }
              setLoading(false);
            }}
          >
            <img src={web3AuthLogoWhite} className="headerLogo" />
            Login via Passkey
          </LoaderButton>
        )}
      </div>
    </div>
  );
};
export default ConnectWeb3AuthButton;
