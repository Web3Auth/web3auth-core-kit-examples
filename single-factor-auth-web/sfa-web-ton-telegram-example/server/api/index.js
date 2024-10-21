const jwt = require("jsonwebtoken");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { AuthDataValidator } = require("@telegram-auth/server");
const { objectToAuthDataMap } = require("@telegram-auth/server/utils");
const RateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

const { TELEGRAM_BOT_TOKEN, JWT_KEY_ID, APP_URL } = process.env;
const privateKey = fs.readFileSync(path.resolve(__dirname, "privateKey.pem"), "utf8");

// Define allowed origins
const allowedOrigins = [APP_URL]; // Add more origins if needed

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Allow only the allowed origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true'); // Allow credentials like cookies
  }

  // Handle preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    return res.sendStatus(204); // Send no content status for OPTIONS requests
  }
  next(); // Pass control to the next middleware
});

// Trust proxy to handle X-Forwarded-For
app.set('trust proxy', 1); // Trust the first proxy in the chain (Vercel)

// Rate limiter configuration
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

app.use(limiter);

// Helper function to generate JWT token
const generateJwtToken = (userData) => {
  console.log("id", userData.id);
  const payload = {
    telegram_id: userData.id,
    username: userData.username,
    avatar_url: userData.photo_url || "https://www.gravatar.com/avatar", // Default photo URL if not available
    sub: userData.id.toString(),
    name: userData.first_name,
    iss: "https://api.telegram.org",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token valid for 1 hour
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

// Route 1: Test route to check if the server is running
app.get("/test", (req, res) => {
  res.json({ message: "Connection successful. Server is running!" });
});

// Route 2: Telegram authentication route
app.post("/auth/telegram", async (req, res) => {
  const { initDataRaw, isMocked } = req.body;
  console.log("Received initDataRaw:", initDataRaw);
  console.log("isMocked:", isMocked);

  if (!initDataRaw) {
    return res.status(400).json({ error: "initDataRaw is required" });
  }

  try {
    // Parse initDataRaw correctly
    const params = new URLSearchParams(initDataRaw);
    const data = Object.fromEntries(params.entries());
    console.log("Parsed Init Data:", data);

    if (isMocked) {
      // Handle the mock case
      const user = JSON.parse(decodeURIComponent(data.user));
      const mockUser = {
        id: user.id,
        username: user.username,
        photo_url: user.photo_url || "https://www.gravatar.com/avatar",
        first_name: user.first_name,
      };
      console.log("Parsed mock user data:", mockUser);

      const JWTtoken = generateJwtToken(mockUser);
      return res.json({ token: JWTtoken });
    }

    // For real scenarios, proceed with validation
    const validator = new AuthDataValidator({ botToken: TELEGRAM_BOT_TOKEN });
    const telegramData = objectToAuthDataMap(params);
    console.log("Telegram data before validation:", telegramData);

    const user = await validator.validate(telegramData);
    console.log("Validated user:", user);

    const validatedUser = {
      ...user,
      photo_url: user.photo_url || "https://www.gravatar.com/avatar",
    };

    const JWTtoken = generateJwtToken(validatedUser);
    res.json({ token: JWTtoken });
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    res.status(400).json({ error: "Invalid Telegram data" });
  }
});

// Start the server
app.listen(3000, () => console.log("Server ready on port 3000."));
