import type { KeyLike } from 'jose';
import { SignJWT } from 'jose';
import type { Client, NextAuthToken } from './types.js';

interface CreateSignTokenParams {
  id: string;
  privateKey: KeyLike;
  expiration?: string | number;
  kid: string;
  issuer: string;
  audience: string;
}

export function createSigningFn({ id, privateKey, expiration, kid, issuer, audience }: CreateSignTokenParams) {
  return async (token: NextAuthToken) => {
    const signed = await new SignJWT(token)
      .setProtectedHeader({
        typ: 'JWT',
        alg: 'RS256',
        kid
      })
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiration ?? '6h')
      .setIssuedAt()
      .sign(privateKey);

    return { id, accessToken: signed };
  };
}

export interface CreateSigningFnsParams {
  clients: Client[];
  privateKey: KeyLike;
  issuer: string;
  kid: string;
}

export function createSigningFns({ clients, privateKey, issuer, kid }: CreateSigningFnsParams) {
  const accessTokenSigningFns = clients.map((client) => {
    return createSigningFn({
      ...client,
      privateKey,
      issuer,
      kid
    });
  });

  return async (token: NextAuthToken) => {
    const signedTokens = await Promise.all(accessTokenSigningFns.map((fn) => fn(token)));
    return signedTokens.reduce((s, v) => ({ ...s, [v.id]: v }), {});
  };
}
