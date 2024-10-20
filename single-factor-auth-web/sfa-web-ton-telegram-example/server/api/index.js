const jwt = require("jsonwebtoken");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { AuthDataValidator } = require("@telegram-auth/server");
const { objectToAuthDataMap } = require("@telegram-auth/server/utils");
const RateLimit = require("express-rate-limit");
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

const { TELEGRAM_BOT_TOKEN, SERVER_URL, JWT_KEY_ID } = process.env;
const privateKey = fs.readFileSync(path.resolve(__dirname, "privateKey.pem"), "utf8");

// CORS configuration
const corsOptions = {
  origin: SERVER_URL || 'http://localhost:3000', // Use the SERVER_URL from .env or fallback to localhost during dev
  credentials: true, // This allows cookies/credentials to be sent across domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'], // Allowed headers
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Handle preflight requests (OPTIONS method) for all routes
app.options('*', cors(corsOptions));

// Rate limiter configuration
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

app.use(limiter);

// Helper function to generate JWT token
const generateJwtToken = (userData) => {
  const payload = {
    telegram_id: userData.id,
    username: userData.username,
    avatar_url: userData.photo_url,
    sub: userData.id.toString(),
    name: userData.first_name,
    iss: "https://api.telegram.org",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

// Validate Telegram data and generate JWT
app.post("/auth/telegram", async (req, res) => {
  const { initDataRaw } = req.body;

  if (!initDataRaw) {
    return res.status(400).json({ error: "initDataRaw is required" });
  }

  const validator = new AuthDataValidator({ botToken: TELEGRAM_BOT_TOKEN });
  const data = objectToAuthDataMap(new URLSearchParams(initDataRaw));

  try {
    const user = await validator.validate(data);
    const JWTtoken = generateJwtToken(user);
    res.json({ token: JWTtoken });
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    res.status(400).json({ error: "Invalid Telegram data" });
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));
