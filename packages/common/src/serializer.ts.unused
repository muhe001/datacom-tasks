import msgpack from 'msgpack-lite';
import { encode, decode,  } from 'base2048'

type Primitive =
  | bigint
  | boolean
  | null
  | number
  | string
  | symbol
  | undefined;

type PlainObject = Record<string, Primitive>;

const toBase64 = (base64url: string): string => (
  base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
);
const fromBase64 = (base64: string): string => (
  base64
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
);

export function encodeCompact(obj: PlainObject) {
  const buffer = msgpack.encode(obj)
  return encode(buffer);
}

export function decodeCompact(str: string) {
  const buffer = decode(str);
  return msgpack.decode(buffer);
}

/**
 * Users can freak out seeing "strange" characters
 * not as compact, but friendlier
 */
export function encodeFriendly(obj: PlainObject) {
  const buffer = msgpack.encode(obj)
  return fromBase64(buffer.toString('base64'));
}

export function decodeFriendly(str: string) {
 const base64Str = toBase64(str);
  return msgpack.decode(Buffer.from(base64Str, 'base64'));
}