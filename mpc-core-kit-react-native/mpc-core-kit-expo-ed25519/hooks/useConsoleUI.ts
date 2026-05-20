import { useState } from "react";

export const useConsoleUI = () => {
  const [consoleUI, setConsoleUI] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const uiConsole = (...args: any) => {
    setConsoleUI(`[LOG]${JSON.stringify(args)}\n${consoleUI}`);
    console.log(...args);
  };

  return { consoleUI, setConsoleUI, uiConsole, loading, setLoading };
};
