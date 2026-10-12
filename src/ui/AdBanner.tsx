import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

/**
 * AdMob banner (native only — see AdBanner.web.tsx for the web stub).
 *
 * The native module does not exist in Expo Go, so it is required lazily and the component renders
 * nothing when it is unavailable, when no unit id is configured, or when the ad fails to fill.
 * Nothing is reserved until an ad has actually loaded — an empty grey strip labelled "Ad" is a
 * store-review risk and looks broken to users.
 */
type Ads = {
  BannerAd: React.ComponentType<Record<string, unknown>>;
  BannerAdSize: Record<string, string>;
  TestIds: Record<string, string>;
  mobileAds: () => { initialize: () => Promise<unknown> };
};

const loadAds = (): Ads | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-google-mobile-ads');
    return { BannerAd: mod.BannerAd, BannerAdSize: mod.BannerAdSize, TestIds: mod.TestIds, mobileAds: mod.default };
  } catch {
    return null;
  }
};

const ads = loadAds();

type AdConfig = { bannerAndroid?: string; bannerIos?: string };

const unitId = (): string | null => {
  if (!ads) return null;
  // Development always gets Google's test unit, never the real one. Impressions and taps on your
  // own live ads are invalid traffic and get AdMob accounts suspended.
  if (__DEV__) return ads.TestIds.BANNER ?? null;
  const cfg = (Constants.expoConfig?.extra?.admob ?? {}) as AdConfig;
  return (Platform.OS === 'ios' ? cfg.bannerIos : cfg.bannerAndroid) || null;
};

/** iOS must ask before an ad can be personalised; a denied prompt just means non-personalised ads. */
async function requestTracking() {
  if (Platform.OS !== 'ios') return;
  try {
    const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
    await requestTrackingPermissionsAsync();
  } catch {
    // tracking module unavailable (Expo Go): fall through to non-personalised ads
  }
}

export default function AdBanner({ onHeight }: { onHeight?: (h: number) => void }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const id = unitId();

  useEffect(() => {
    if (!ads || !id) return;
    let cancelled = false;
    requestTracking()
      .then(() => ads.mobileAds().initialize())
      .then(() => !cancelled && setReady(true))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!ads || !id || failed || !ready) return null;

  const { BannerAd, BannerAdSize } = ads;
  return (
    <View
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }}
    >
      <BannerAd
        unitId={id}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => {
          setFailed(true);
          onHeight?.(0);
        }}
      />
    </View>
  );
}
