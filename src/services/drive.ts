import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/** appdata = a private per-app folder. The app can never see the rest of the user's Drive. */
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];
const FILE = 'expense-manager-backup.json';
const FILES = 'https://www.googleapis.com/drive/v3/files';

type GoogleConfig = { ios?: string; android?: string; web?: string };

const clientId = () => {
  const cfg = (Constants.expoConfig?.extra?.google ?? {}) as GoogleConfig;
  const id = Platform.OS === 'ios' ? cfg.ios : Platform.OS === 'android' ? cfg.android : cfg.web;
  if (!id) throw new Error('Google Drive is not configured yet: add expo.extra.google client IDs in app.json.');
  return id;
};

export const isConfigured = () => {
  try {
    return !!clientId();
  } catch {
    return false;
  }
};

// ponytail: implicit token, no refresh token, no secret. Backup is user-initiated, so a re-consent tap is cheaper than a token store.
let token: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;

  const request = new AuthSession.AuthRequest({
    clientId: clientId(),
    scopes: SCOPES,
    responseType: AuthSession.ResponseType.Token,
    redirectUri: AuthSession.makeRedirectUri(),
    usePKCE: false,
  });
  const result = await request.promptAsync(DISCOVERY);
  if (result.type !== 'success' || !result.authentication?.accessToken) {
    throw new Error(result.type === 'error' ? (result.error?.message ?? 'Google sign-in failed.') : 'Google sign-in cancelled.');
  }
  const auth = result.authentication;
  token = { value: auth.accessToken, expiresAt: Date.now() + (auth.expiresIn ?? 3600) * 1000 };
  return token.value;
}

export const signOut = () => {
  token = null;
};

async function api(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    if (res.status === 401) token = null;
    throw new Error(`Google Drive error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res;
}

const findFileId = async (): Promise<string | null> => {
  const q = encodeURIComponent(`name='${FILE}' and trashed=false`);
  const res = await api(`${FILES}?spaces=appDataFolder&fields=files(id)&q=${q}`);
  return (await res.json()).files?.[0]?.id ?? null;
};

/** Write the whole app state to the private Drive folder. Returns the backup timestamp. */
export async function backup(data: unknown): Promise<number> {
  const body = JSON.stringify({ savedAt: Date.now(), data });
  const id = await findFileId();

  if (id) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } else {
    const boundary = 'em-' + Date.now();
    const metadata = JSON.stringify({ name: FILE, parents: ['appDataFolder'], mimeType: 'application/json' });
    await api(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body:
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`,
    });
  }
  return Date.now();
}

/** Read the backup back, e.g. after a reinstall. null when the account has never backed up. */
export async function restore<T>(): Promise<{ savedAt: number; data: T } | null> {
  const id = await findFileId();
  if (!id) return null;
  const res = await api(`${FILES}/${id}?alt=media`);
  const json = await res.json();
  return json && typeof json === 'object' && 'data' in json ? json : null;
}
