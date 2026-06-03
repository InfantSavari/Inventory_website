import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
<<<<<<< HEAD
  process.env.JWT_SECRET || 'default-super-secret-key-for-local-dev-1234567890'
=======
  process.env.JWT_SECRET
>>>>>>> 3d643e1 (unit Conversion is done)
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}
