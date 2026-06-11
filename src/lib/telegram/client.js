// src/lib/telegram/client.js

// Using global fetch (available in Next.js/Node 18+)
export async function sendTelegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set.");
    return null;
  }
  
  const TELEGRAM_API = `https://api.telegram.org/bot${token}`;

  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    if (!data.ok) {
      console.error(`❌ Telegram API Error [${method}]:`, data.description);
    }
    return data;
  } catch (error) {
    console.error(`❌ Telegram Network Error [${method}]:`, error.message);
    return null;
  }
}

export async function sendMessage(chatId, text, options = {}) {
  return sendTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    ...options
  });
}

export async function answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
  return sendTelegram('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: showAlert
  });
}

export async function editMessageText(chatId, messageId, text, options = {}) {
  return sendTelegram('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'Markdown',
    ...options
  });
}
