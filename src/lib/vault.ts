import { storage } from './storage';
interface Envelope {
  version: 1;
  salt: number[];
  iv: number[];
  cipher: number[];
}
let secrets: Record<string, string> = {};
let passwordInMemory: string | undefined;
let writeQueue = Promise.resolve();
export function getSecret(id: string) {
  return secrets[id] ?? '';
}
export function hasSecret(id: string) {
  return !!secrets[id];
}
export function vaultUnlocked() {
  return !!passwordInMemory;
}
export async function vaultExists() {
  return !!(await storage.read('vault'));
}
async function derive(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 310000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
async function persist() {
  if (!passwordInMemory) return;
  const password = passwordInMemory;
  const snapshot = JSON.stringify(secrets);
  writeQueue = writeQueue
    .catch(() => {})
    .then(async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await derive(password, salt);
      const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(snapshot),
      );
      await storage.write<Envelope>('vault', {
        version: 1,
        salt: [...salt],
        iv: [...iv],
        cipher: [...new Uint8Array(cipher)],
      });
    });
  return writeQueue;
}
export async function setSecret(id: string, value: string) {
  secrets[id] = value;
  await persist();
}
export async function deleteSecret(id: string) {
  delete secrets[id];
  await persist();
}
export async function unlockVault(password: string) {
  if (!crypto.subtle)
    throw new Error('密钥库需要 HTTPS 或 localhost / The vault requires HTTPS or localhost.');
  const e = await storage.read<Envelope>('vault');
  if (e) {
    const key = await derive(password, new Uint8Array(e.salt));
    const data = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(e.iv) },
      key,
      new Uint8Array(e.cipher),
    );
    const decoded: unknown = JSON.parse(new TextDecoder().decode(data));
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      Object.values(decoded).some((v) => typeof v !== 'string')
    )
      throw new Error('Invalid vault');
    secrets = { ...(decoded as Record<string, string>), ...secrets };
  } else if (password.length < 10)
    throw new Error('Use at least 10 characters / 请使用至少 10 位密码');
  passwordInMemory = password;
  await persist();
}
export function lockVault() {
  secrets = {};
  passwordInMemory = undefined;
}
export async function forgetVault() {
  lockVault();
  await writeQueue.catch(() => {});
  await storage.remove('vault');
}
