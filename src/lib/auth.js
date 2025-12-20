import { jwtVerify, SignJWT } from 'jose';

// Ambil kunci rahasia dari .env
const getSecretKey = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return new TextEncoder().encode(secret);
};

// Fungsi Membuat Token (Login)
export async function signJWT(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // Token berlaku 7 hari
        .sign(getSecretKey());
}

// Fungsi Cek Token (Middleware)
export async function verifyJWT(token) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());
        return payload;
    } catch (error) {
        return null; // Token tidak valid / expired
    }
}