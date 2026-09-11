import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { isNewerVersion } from '../lib/logic';

export type UpdateInfo = { version: string; notes: string; url: string };

const current = () => Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';

/**
 * Ask the store whether a newer build is live.
 * iOS: the public iTunes Lookup API (Apple has no in-app "update available" API).
 * Android: Play exposes no version API — Play's own In-App Updates flow needs a native module and a dev build,
 * so we read an optional expo.extra.androidUpdateUrl JSON ({ version, notes, url }) instead.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    if (Platform.OS === 'ios') {
      const id = Application.applicationId ?? Constants.expoConfig?.ios?.bundleIdentifier;
      if (!id) return null;
      const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${id}&t=${Date.now()}`);
      const app = (await res.json())?.results?.[0];
      if (!app?.version || !isNewerVersion(app.version, current())) return null;
      return { version: app.version, notes: app.releaseNotes ?? '', url: app.trackViewUrl };
    }

    if (Platform.OS === 'android') {
      const feed = Constants.expoConfig?.extra?.androidUpdateUrl as string | undefined;
      const id = Application.applicationId ?? Constants.expoConfig?.android?.package;
      if (!feed) return null;
      const info = (await (await fetch(feed)).json()) as Partial<UpdateInfo>;
      if (!info?.version || !isNewerVersion(info.version, current())) return null;
      return { version: info.version, notes: info.notes ?? '', url: info.url ?? `market://details?id=${id}` };
    }
  } catch {
    // offline or store lookup failed: never block the app over an update check
  }
  return null;
}

export const openStore = (url: string) => Linking.openURL(url).catch(() => {});
