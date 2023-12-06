import React from "react";

import ConnectWeb3AuthButton from "./ConnectWeb3AuthButton";

const NotConnectedPage = () => {
  return (
    <div className=" w-full h-full flex flex-1 flex-col bg-gray-50 items-center justify-center overflow-scroll">
      <ConnectWeb3AuthButton />
    </div>
  );
};
export default NotConnectedPage;
