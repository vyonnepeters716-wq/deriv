const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Read secrets from environment variables (set on Render)
const TELEGRAM_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── POST /submit — receive form data and forward to Telegram ──
app.post('/submit', async (req, res) => {
  const { email, orderId, reason } = req.body;

  if (!email || !orderId || !reason) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const reasonLabels = {
    no_payment : 'No payment received',
    no_proof   : 'No payment proof',
    fraud      : 'Suspected fraud',
    other      : 'Other',
  };

  const message = `
🔔 *New P2P Reversal Request*

📧 *Email:* \`${email}\`
🆔 *Order ID:* \`${orderId}\`
📋 *Reason:* ${reasonLabels[reason] || reason}
🕒 *Time:* ${new Date().toUTCString()}
  `.trim();

  try {
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({
          chat_id    : TELEGRAM_CHAT_ID,
          text       : message,
          parse_mode : 'Markdown',
        }),
      }
    );

    const data = await telegramRes.json();

    if (!data.ok) {
      console.error('Telegram error:', data);
      return res.status(500).json({ success: false, message: 'Failed to send Telegram notification.' });
    }

    return res.json({ success: true, message: 'Reversal submitted successfully!' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// Fallback — serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Deriv P2P server running on port ${PORT}`);
});
