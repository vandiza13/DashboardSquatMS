import PusherClient from 'pusher-js';

// Gunakan fallback 'ap1' (atau nilai dummy) jika env tidak terbaca saat build
// Ini mencegah error "Options object must provide a cluster"
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || 'APP_KEY';
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  // Opsi tambahan untuk mencegah error di server-side rendering (build time)
  authEndpoint: '/api/pusher/auth', 
});