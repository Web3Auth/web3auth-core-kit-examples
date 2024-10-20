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

// Rate limiter configuration: limit to 100 requests per 15 minutes
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

// Apply rate limiter to all routes
app.use(limiter);

const { TELEGRAM_BOT_TOKEN, SERVER_URL, JWT_KEY_ID } = process.env;

// Read private key for JWT signing
const privateKey = fs.readFileSync(path.resolve(__dirname, "privateKey.pem"), "utf8");

// Helper function to generate JWT token using the Telegram user data
const generateJwtToken = (userData) => {
  const payload = {
    telegram_id: userData.id,
    username: userData.username,
    avatar_url: userData.photo_url,
    sub: userData.id.toString(), // Subject is the user ID
    name: userData.first_name, // Full name if you want to include
    iss: "https://api.telegram.org", // Issuer is your server URL
    iat: Math.floor(Date.now() / 1000), // Issued at time
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

// Default route to check if the server is running
app.get("/", (req, res) => res.send("Express on Vercel for Telegram Login to be used with Web3Auth"));

// Serving the JWKS for verifying JWT signature
app.get("/.well-known/jwks.json", (req, res) => {
  const jwks = fs.readFileSync(path.resolve(__dirname, "jwks.json"), "utf8");
  res.json(JSON.parse(jwks)); // Return JWKS JSON file
});

// Endpoint to validate Telegram data and generate JWT
app.post("/auth/telegram", async (req, res) => {
  const { initDataRaw } = req.body; // Get initDataRaw from the request body

  if (!initDataRaw) {
    return res.status(400).json({ error: "initDataRaw is required" });
  }

  const validator = new AuthDataValidator({ botToken: TELEGRAM_BOT_TOKEN });
  const data = objectToAuthDataMap(new URLSearchParams(initDataRaw)); // Parse initDataRaw

  try {
    // Validate Telegram data
    const user = await validator.validate(data);

    // Generate a JWT token
    const JWTtoken = generateJwtToken(user);

    // Send back the JWT token to the client
    res.json({ token: JWTtoken });
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    res.status(400).json({ error: "Invalid Telegram data" });
  }
});

// Server listening on port 3000 (or replace with your Vercel/Heroku port settings)
app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
