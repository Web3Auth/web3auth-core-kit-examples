import { mockTelegramEnv, parseInitData } from "@telegram-apps/sdk-react"; 

export function mockTelegramEnvironment() {
  console.log("Mocking Telegram environment...");
  
  const mockInitDataRaw = new URLSearchParams([
    ['user', JSON.stringify({
      id: 123456789,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      language_code: "en",
      is_premium: false,
      allows_write_to_pm: true
    })],
    ['hash', 'abc123def456'],
    ['auth_date', '1700000000'],
  ]).toString();

  mockTelegramEnv({
    initDataRaw: mockInitDataRaw,
    initData: parseInitData(mockInitDataRaw),
    platform: "web", // Simulate a web platform
    version: "7.1",
    themeParams: {
      accentTextColor: '#6ab2f2',
      bgColor: '#ffffff',
      buttonColor: '#5288c1',
      buttonTextColor: '#ffffff',
    }
  });

  console.info("Telegram environment successfully mocked.");
}
