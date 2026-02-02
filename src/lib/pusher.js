// src/lib/pusher.js
import PusherServer from 'pusher';

// Pastikan variabel environment ini ada di .env Anda
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY, // Gunakan key public agar sama
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER, // Gunakan cluster public agar sama
  useTLS: true,
});