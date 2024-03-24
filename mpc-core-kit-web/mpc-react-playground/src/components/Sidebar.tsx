import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useMPCCoreKit } from "../services/mpcCoreKit";

const Sidebar = () => {
  const { provider, user, keyDetails } = useMPCCoreKit();

  const navigate = useNavigate();
  function goToHome() {
    keyDetails();
    navigate("/");
  }
  function goToBlockchainCall() {
    navigate("/blockchaincalls");
  }
  function goToRecoverySetup() {
    navigate("/recoverysetup");
  }

  function goToRecover() {
    navigate("/recover");
  }

  function goToEnableMFA() {
    navigate("/enableMFA");
  }

  function goToExplorer() {
    window.open("https://goerli.etherscan.io/", "_blank");
  }
  function goToFaucet() {
    window.open("https://goerlifaucet.com/", "_blank");
  }
  const location = useLocation();
  function linktoGo(label: string, path: any) {
    return (
      <div
        onClick={() => path()}
        className="flex items-center px-4 py-2 mb-2 text-gray-500 rounded-lg hover:bg-gray-100 hover:text-primary  cursor-pointer"
      >
        <span className="text-sm font-normal">{label}</span>
      </div>
    );
  }
  function activePage(label: string) {
    return (
      <div className="flex items-center px-4 py-2 mb-2 rounded-lg bg-gray-100 text-primary  cursor-pointer">
        <span className="text-sm font-bold">{label}</span>
      </div>
    );
  }
  function userProfile() {
    if (provider) {
      try {
        return (
          <div className="sticky px-4 inset-x-0 bottom-0 border-t border-gray-100">
            <div className="flex items-center justify-flex-start py-4 shrink-0 overflow-hidden">
              <img className="object-cover w-10 h-10 rounded-full" src={user.profileImage} referrerPolicy="no-referrer" />

              <div className="ml-1.5">
                <p className="text-xs">
                  <strong className="block font-medium">{user.name as string}</strong>
                  <span>{user.email as string}</span>
                </p>
              </div>
            </div>
          </div>
        );
      } catch (e) {
        return null;
      }
    } else {
      return null;
    }
  }

  return (
    <div className="flex flex-col justify-between h-screen bg-white border-r w-64 p-5 lg:flex hidden">
      <div className="py-3">
        <strong className="px-4 block p-1 text-xs font-medium text-gray-400 uppercase">MENU</strong>
        <nav className="flex flex-col mt-6">
          {location.pathname === "/" ? activePage("Main Page") : linktoGo("Main Page", goToHome)}
          {location.pathname === "/enableMFA" ? activePage("Enable MFA") : linktoGo("Enable MFA", goToEnableMFA)}
          {location.pathname === "/recoverySetup" ? activePage("Recovery Setup") : linktoGo("Recovery Setup", goToRecoverySetup)}
          {location.pathname === "/recovery" ? activePage("Recover Account") : linktoGo("Recover Account", goToRecover)}
          {location.pathname === "/blockchaincalls" ? activePage("BlockChain Calls") : linktoGo("BlockChain Calls", goToBlockchainCall)}
          {linktoGo("Explorer Link", goToExplorer)}
          {linktoGo("Faucet Link", goToFaucet)}
        </nav>
      </div>
      {userProfile()}
    </div>
  );
};
export default Sidebar;
