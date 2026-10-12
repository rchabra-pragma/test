import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
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

// Authorization-code + PKCE. Google rejects the implicit flow (`response_type=token`) for installed
// apps, so the code is exchanged for a token with a verifier instead of a client secret.
let token: { value: string; expiresAt: number } | null = null;
let refreshToken: string | null = null;

const EXPIRY_SKEW = 60_000;

const store = (auth: { accessToken: string; expiresIn?: number | null; refreshToken?: string | null }) => {
  token = { value: auth.accessToken, expiresAt: Date.now() + (auth.expiresIn ?? 3600) * 1000 };
  if (auth.refreshToken) refreshToken = auth.refreshToken;
  return token.value;
};

/** Silent renewal. Returns null when there is no usable refresh token, so the caller falls back to consent. */
async function refresh(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const result = await AuthSession.refreshAsync({ clientId: clientId(), refreshToken }, DISCOVERY);
    return result.accessToken ? store(result) : null;
  } catch {
    refreshToken = null;
    return null;
  }
}

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + EXPIRY_SKEW) return token.value;

  const renewed = await refresh();
  if (renewed) return renewed;

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'expensemanager' });
  const request = new AuthSession.AuthRequest({
    clientId: clientId(),
    scopes: SCOPES,
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const result = await request.promptAsync(DISCOVERY);
  if (result.type !== 'success' || !result.params.code) {
    throw new Error(result.type === 'error' ? (result.error?.message ?? 'Google sign-in failed.') : 'Google sign-in cancelled.');
  }

  const exchanged = await AuthSession.exchangeCodeAsync(
    {
      clientId: clientId(),
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier ?? '' },
    },
    DISCOVERY,
  );
  if (!exchanged.accessToken) throw new Error('Google did not return an access token.');
  return store(exchanged);
}

export const signOut = () => {
  token = null;
  refreshToken = null;
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

/**
 * Delete the Drive backup and disconnect the account.
 * Google Play requires an in-app path to erase data an app has stored off-device.
 */
export async function deleteBackup(): Promise<string> {
  const id = await findFileId();
  if (id) await api(`${FILES}/${id}`, { method: 'DELETE' });

  const toRevoke = refreshToken ?? token?.value;
  if (toRevoke) {
    await AuthSession.revokeAsync({ token: toRevoke, clientId: clientId() }, DISCOVERY).catch(() => {});
  }
  signOut();
  return id ? 'Backup deleted from Google Drive and the account disconnected.' : 'No backup to delete. Account disconnected.';
}
