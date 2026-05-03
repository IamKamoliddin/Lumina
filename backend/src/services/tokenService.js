import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import ms from 'ms'
import { env } from '../config/env.js'

export const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'access',
    },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL },
  )

export const signRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL },
  )

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET)

export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET)

export const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

export const getAccessTokenMaxAge = () => ms(env.ACCESS_TOKEN_TTL)

export const getRefreshTokenMaxAge = () => ms(env.REFRESH_TOKEN_TTL)
