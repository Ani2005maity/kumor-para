import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UserRole } from '@kumorpara/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  version?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'kumor_para_jwt_super_secret_key_2026_dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'kumor_para_jwt_refresh_secret_key_2026_dev';

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const sameSite = (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || (isProduction ? 'lax' : 'lax');

  // 15 minutes in ms
  const accessTokenMaxAge = 15 * 60 * 1000;
  // 7 days in ms
  const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000;

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    maxAge: accessTokenMaxAge,
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    maxAge: refreshTokenMaxAge,
    path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const sameSite = (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || (isProduction ? 'lax' : 'lax');

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    path: '/',
  });
}
