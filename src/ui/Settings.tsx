import Constants from 'expo-constants';
import React, { useContext } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { Button, Card, Screen, Segmented, ThemeCtx } from './index';
import CurrencyPicker from './CurrencyPicker';

const THEMES = [
  { key: 'dark' as const, label: '🌙  Dark' },
  { key: 'light' as const, label: '☀️  Light' },
];

export type SettingsProps = {
  theme: 'dark' | 'light';
  onTheme: (t: 'dark' | 'light') => void;
  currency: string;
  onCurrency: (code: string) => void;
  lastBackupAt: number | null;
  busy: string;
  driveReady: boolean;
  onBackup: () => void;
  onRestore: () => void;
  onClose: () => void;
};

export default function Settings({
  theme,
  onTheme,
  currency,
  onCurrency,
  lastBackupAt,
  busy,
  driveReady,
  onBackup,
  onRestore,
  onClose,
}: SettingsProps) {
  const c = useContext(ThemeCtx);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title="Settings" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Appearance</Text>
          <Segmented options={THEMES} value={theme} onChange={onTheme} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Currency</Text>
          <CurrencyPicker value={currency} onChange={onCurrency} />
          <Text style={{ color: c.sub, fontSize: 12 }}>
            New entries default to this. Existing entries keep the currency they were saved with.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Backup</Text>
          <Card style={{ gap: 10 }}>
            <Text style={{ color: c.text, fontWeight: '700' }}>☁️  Google Drive</Text>
            <Text style={{ color: c.sub, fontSize: 13, lineHeight: 19 }}>
              {lastBackupAt ? `Last backup ${new Date(lastBackupAt).toLocaleString()}.` : 'No backup yet.'} Backups live in a
              private app folder in your Drive — restore them after a reinstall or on a new phone.
              {driveReady ? '' : ' Add your Google client IDs to app.json to enable this.'}
            </Text>
            <Button label={busy || 'Back up now'} onPress={onBackup} />
            <Button label="Restore from Drive" tone="ghost" onPress={onRestore} />
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>About</Text>
          <Card style={{ gap: 6 }}>
            <Text style={{ color: c.text, fontWeight: '700' }}>Expense Manager</Text>
            <Text style={{ color: c.sub, fontSize: 13 }}>
              Version {version} · {Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
            <Text style={{ color: c.sub, fontSize: 13, lineHeight: 19 }}>
              Track day-to-day income and expenses, chart them by category, page through months and years, and export any period
              as CSV or PDF. Entries are stored on this device and only leave it when you back up to your own Google Drive.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
