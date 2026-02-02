// src/lib/pusher-client.js
import PusherClient from 'pusher-js';

// Aktifkan log agar muncul di Console Browser (F12)
PusherClient.logToConsole = false;

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
});