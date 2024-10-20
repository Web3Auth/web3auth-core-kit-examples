import { useEffect } from "react";
import { isTMA, init } from "@telegram-apps/sdk-react";
import { mockTelegramEnvironment } from "./hooks/useMockTelegramInitData";
import App from "./App";

const TelegramAppWrapper = () => {
  useEffect(() => {
    const checkTelegramEnvironment = async () => {
      const telegramEnv = await isTMA(); // Check if it's Telegram Mini App
      
      if (telegramEnv) {
        console.log("Running inside Telegram Mini App. Initializing...");
        try {
          init(); // Initialize Telegram SDK
        } catch (error) {
          console.error("Error initializing Telegram Mini App:", error);
        }
      } else {
        console.warn("Not running inside Telegram Mini App. Mocking environment for development...");
        if (process.env.NODE_ENV === "development") {
          mockTelegramEnvironment();
        }
      }
    };

    checkTelegramEnvironment();
  }, []);

  return <App />;
};

export default TelegramAppWrapper;
