import { Telegraf } from "telegraf";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  // Command handler
  bot.command('start', async (ctx) => {
    try {
      await ctx.reply('Welcome to Web3 Wallet! Click below to get started:', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "Open Web3 Wallet 🚀",
              web_app: { url: process.env.APP_URL }
            }
          ]]
        }
      });
    } catch (error) {
      console.error('Error in start command:', error);
    }
  });

  try {
    // Process the update
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Failed to process update' });
  }
}

// Disable body parsing as Telegram sends updates in raw format
export const config = {
  api: {
    bodyParser: false,
  },
};