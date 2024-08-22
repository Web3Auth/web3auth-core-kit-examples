const jwt = require("jsonwebtoken");
const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { AuthDataValidator } = require("@telegram-auth/server");
const { objectToAuthDataMap } = require("@telegram-auth/server/utils");
const crypto = require('crypto');

dotenv.config();

const app = express();

const { TELEGRAM_BOT_NAME, TELEGRAM_BOT_TOKEN, SERVER_URL, CLIENT_URL, JWT_KEY_ID } = process.env;
const TELEGRAM_BOT_CALLBACK = `${SERVER_URL}/callback`;
const privateKey = fs.readFileSync(path.resolve(__dirname, "privateKey.pem"), "utf8");

// A helper function to generate JWT token using the Telegram user data
const generateJwtToken = (userData) => {
  const payload = {
    telegram_id: userData.id,
    username: userData.username,
    avatar_url: userData.photo_url,
    sub: userData.id.toString(),
    name: userData.first_name,
    iss: "https://api.telegram.org",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
  };

  return jwt.sign(payload, privateKey, { algorithm: "RS256", keyid: JWT_KEY_ID });
};

function validateTelegramWebAppData(telegramInitData) {
  // Parse the received init data
  const initData = new URLSearchParams(telegramInitData);

  // Extract the hash and remove it from the data
  const hash = initData.get('hash');
  initData.delete('hash');

  // Sort the data alphabetically
  const sortedInitData = new URLSearchParams([...initData.entries()].sort());

  // Create a data check string
  const dataCheckString = sortedInitData.toString();

  // Create a secret key from the bot token
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();

  // Calculate the hmac-sha256 signature
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Compare the calculated hash with the received hash
  return calculatedHash === hash;
}

app.get("/", (req, res) => res.send("Express on Vercel for Telegram Login to be used with Web3Auth"));

app.get("/.well-known/jwks.json", (req, res) => {
  const jwks = fs.readFileSync(path.resolve(__dirname, "jwks.json"), "utf8");
  res.send(JSON.parse(jwks));
});

// Endpoint to serve the login page
app.get("/login", (req, res) => {
  let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Telegram OAuth App with Web3Auth</title>
      <style>
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <script>
        const script = document.createElement("script");
        script.async = true;
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.setAttribute("data-telegram-login", "${TELEGRAM_BOT_NAME}");
        script.setAttribute("data-size", "large");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-auth-url", "${SERVER_URL}/callback");

        document.body.appendChild(script);
      </script>
      <noscript>You need to enable JavaScript to run this app.</noscript>
    </body>
  </html>
  `;

  res.send(htmlContent);
});

// Endpoint to handle the Telegram callback
app.get("/callback", async (req, res) => {
  const validator = new AuthDataValidator({ botToken: TELEGRAM_BOT_TOKEN });
  const data = objectToAuthDataMap(req.query || {});

  try {
    const user = await validator.validate(data);
    const JWTtoken = generateJwtToken(user);

    const redirectUrl = `${CLIENT_URL}?token=${JWTtoken}`; // Redirect back to frontend with token
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    res.status(400).send("Invalid Telegram data");
  }
});

app.post("/auth", (req, res) => {
  const { telegramInitData, user } = req.body;

  if (!validateTelegramWebAppData(telegramInitData)) {
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  // If validation passes, generate a JWT token
  const token = jwt.sign(
    { 
      telegramId: user.id, 
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;