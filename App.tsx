import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  DEFAULT_CATEGORIES,
  ICONS,
  PALETTE,
  backupIsStale,
  byCategory,
  byCurrency,
  filterTxs,
  groupForPeriod,
  inPeriod,
  isDate,
  money,
  monthLabel,
  periodLabel,
  shiftPeriod,
  slices,
  suggestCategory,
  suggestions,
  toCSV,
  today,
  totals,
  totalsByCurrency,
  type Category,
  type Filter,
  type Period,
  type Tx,
  type TxType,
} from './src/lib/logic';
import { DEFAULT_CURRENCY, currencyOf } from './src/lib/currency';
import { Bar, Button, Card, Chip, Donut, Screen, Segmented, ThemeCtx, dark, light, s as ui } from './src/ui';
import CurrencyPicker from './src/ui/CurrencyPicker';
import DateField from './src/ui/DateField';
import Settings from './src/ui/Settings';
import { exportPDF } from './src/services/pdf';
import * as Drive from './src/services/drive';
import { checkForUpdate, openStore, type UpdateInfo } from './src/services/update';

const KEY = 'expense-clone/v1';

type Saved = { txs: Tx[]; cats: Category[]; theme: 'dark' | 'light'; lastBackupAt: number | null; currency: string };

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expenses' },
  { key: 'income', label: 'Income' },
];

/** Entries saved before currencies existed (and any restored backup) inherit the saved preference. */
const withCurrency = (s: Saved): Saved => ({
  ...s,
  currency: s.currency ?? DEFAULT_CURRENCY,
  txs: s.txs.map((t) => (t.currency ? t : { ...t, currency: s.currency ?? DEFAULT_CURRENCY })),
});

const prettyDate = (d: string) => {  const t = today();
  if (d === t) return 'Today';
  if (d === new Date(Date.parse(t) - 864e5).toISOString().slice(0, 10)) return 'Yesterday';
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function App() {
  const [state, setState] = useState<Saved>({
    txs: [],
    cats: DEFAULT_CATEGORIES,
    theme: 'dark',
    lastBackupAt: null,
    currency: DEFAULT_CURRENCY,
  });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'home' | 'reports'>('home');
  const [period, setPeriod] = useState<Period>('month');
  const [filter, setFilter] = useState<Filter>('all');
  const [ref, setRef] = useState(today());
  const [editing, setEditing] = useState<Tx | 'new' | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [askBackup, setAskBackup] = useState(false);
  const [settings, setSettings] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const { width, height } = useWindowDimensions();
  const adHeight = Math.min(Math.round(height * 0.1), 60);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState((s) => withCurrency({ ...s, ...JSON.parse(raw) })))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  useEffect(() => {
    checkForUpdate().then(setUpdate);
  }, []);

  useEffect(() => {
    if (ready && Drive.isConfigured() && backupIsStale(state.lastBackupAt)) setAskBackup(true);
  }, [ready]);

  const c = state.theme === 'dark' ? dark : light;
  const visible = useMemo(() => filterTxs(inPeriod(state.txs, period, ref), filter), [state.txs, period, ref, filter]);
  const sum = totals(visible);
  const colorOf = (name: string) => state.cats.find((x) => x.name === name)?.color ?? c.sub;
  const iconOf = (name: string) => state.cats.find((x) => x.name === name)?.icon ?? '•';

  const save = (tx: Tx) =>
    setState((s) => ({
      ...s,
      txs: s.txs.some((t) => t.id === tx.id) ? s.txs.map((t) => (t.id === tx.id ? tx : t)) : [tx, ...s.txs],
    }));

  const runDrive = async (label: string, job: () => Promise<string>) => {
    setBusy(label);
    try {
      setNotice(await job());
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Google Drive failed.');
    } finally {
      setBusy('');
      setAskBackup(false);
    }
  };

  const backupNow = () =>
    runDrive('Backing up…', async () => {
      const savedAt = await Drive.backup({ txs: state.txs, cats: state.cats });
      setState((s) => ({ ...s, lastBackupAt: savedAt }));
      return 'Backed up to Google Drive.';
    });

  const restoreNow = () =>
    runDrive('Restoring…', async () => {
      const found = await Drive.restore<{ txs: Tx[]; cats: Category[] }>();
      if (!found) return 'No backup found in this Google account.';
      setState((s) => ({
        ...withCurrency(s),
        // merge, so restoring after a reinstall brings old data back without dropping anything entered since
        txs: [
          ...found.data.txs.map((t) => (t.currency ? t : { ...t, currency: s.currency })),
          ...s.txs.filter((t) => !found.data.txs.some((b) => b.id === t.id)),
        ],
        cats: [...found.data.cats, ...s.cats.filter((x) => !found.data.cats.some((b) => b.name === x.name && b.type === x.type))],
        lastBackupAt: found.savedAt,
      }));
      return `Restored ${found.data.txs.length} entries from ${new Date(found.savedAt).toLocaleString()}.`;
    });

  const exportCSV = async () => {
    const csv = toCSV(visible);
    const name = `expenses-${period}-${today()}.csv`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // ponytail: share sheet, not a file write. Swap in expo-file-system if a real .csv on disk is needed.
      await Share.share({ message: csv, title: name });
    }
  };

  const downloadPDF = () => exportPDF(visible, period, ref).catch((e) => setNotice(e?.message ?? 'Could not create the PDF.'));

  return (
    <ThemeCtx.Provider value={c}>
      <View style={[st.app, { backgroundColor: c.bg }]}>
        <StatusBar style={state.theme === 'dark' ? 'light' : 'dark'} />
        <View style={{ width: Math.min(width, 620), flex: 1 }}>
          <View style={[ui.row, st.header]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.sub, fontSize: 13 }}>Day-to-day</Text>
              <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>Expense Manager</Text>
            </View>
            <Pressable
              onPress={() => setSettings(true)}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={[st.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginTop: -4 }}>⋮</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
            <Segmented
              options={PERIODS}
              value={period}
              onChange={(p) => {
                setPeriod(p);
                setRef(today());
              }}
            />
            <PeriodNav period={period} value={ref} onChange={setRef} />
            {period !== 'day' && <Segmented options={FILTERS} value={filter} onChange={setFilter} />}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 130 + adHeight }}>
            <Card style={{ marginBottom: 16, gap: 14 }}>
              {(totalsByCurrency(visible).length ? totalsByCurrency(visible) : [{ currency: state.currency, income: 0, expense: 0, balance: 0 }]).map(
                (t) => (
                  <View key={t.currency}>
                    <Text style={{ color: c.sub, fontSize: 13 }}>
                      Balance · {currencyOf(t.currency).flag} {t.currency}
                    </Text>
                    <Text style={{ color: c.text, fontSize: 34, fontWeight: '800', marginTop: 2 }}>
                      {money(t.balance, t.currency)}
                    </Text>
                    <View style={[ui.row, { marginTop: 14, gap: 10 }]}>
                      <Stat label="Income" value={t.income} currency={t.currency} color={c.income} />
                      <Stat label="Expense" value={t.expense} currency={t.currency} color={c.expense} />
                    </View>
                  </View>
                ),
              )}
            </Card>

            {tab === 'home' ? (
              <HomeList txs={visible} period={period} colorOf={colorOf} iconOf={iconOf} onPick={setEditing} />
            ) : (
              <Reports
                txs={visible}
                cats={state.cats}
                filter={filter}
                fallbackCurrency={state.currency}
                colorOf={colorOf}
                iconOf={iconOf}
                onPick={setEditing}
                onExport={exportCSV}
                onPDF={downloadPDF}
              />
            )}
          </ScrollView>

          <View style={[st.tabbar, { bottom: adHeight + 20, backgroundColor: c.card, borderColor: c.border }]}>
            <Chip label="🧾  Transactions" active={tab === 'home'} onPress={() => setTab('home')} />
            <Chip label="📊  Reports" active={tab === 'reports'} onPress={() => setTab('reports')} />
          </View>

          <Pressable
            onPress={() => setEditing('new')}
            accessibilityRole="button"
            accessibilityLabel="Add entry"
            style={[st.fab, { bottom: adHeight + 92, backgroundColor: c.accent }]}
          >
            <Text style={{ color: c.onAccent, fontSize: 30, marginTop: -3 }}>+</Text>
          </Pressable>

          {period !== 'day' && (
            <Pressable
              onPress={downloadPDF}
              accessibilityRole="button"
              accessibilityLabel={`Download ${periodLabel(ref, period)} as PDF`}
              style={[st.fabSmall, { bottom: adHeight + 34, backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={{ fontSize: 18 }}>⬇️</Text>
            </Pressable>
          )}

          <AdSlot height={adHeight} />
        </View>

        {editing && (
          <Editor
            tx={editing === 'new' ? null : editing}
            cats={state.cats}
            txs={state.txs}
            defaultCurrency={state.currency}
            onAddCategory={(cat) => setState((s) => ({ ...s, cats: [...s.cats, cat] }))}
            onClose={() => setEditing(null)}
            onSave={(tx) => {
              save(tx);
              setEditing(null);
            }}
            onDelete={(id) => {
              setState((s) => ({ ...s, txs: s.txs.filter((t) => t.id !== id) }));
              setEditing(null);
            }}
          />
        )}

        {settings && (
          <Settings
            theme={state.theme}
            onTheme={(theme) => setState((s) => ({ ...s, theme }))}
            currency={state.currency}
            onCurrency={(currency) => setState((s) => ({ ...s, currency }))}
            lastBackupAt={state.lastBackupAt}
            busy={busy}
            driveReady={Drive.isConfigured()}
            onBackup={backupNow}
            onRestore={restoreNow}
            onClose={() => setSettings(false)}
          />
        )}

        {askBackup && (
          <Dialog
            title="Time to back up"
            body={
              state.lastBackupAt
                ? `Your last Google Drive backup was ${new Date(state.lastBackupAt).toLocaleDateString()}. Back up now so nothing is lost.`
                : 'You have no Google Drive backup yet. Back up now so your data survives a reinstall.'
            }
            confirm={busy || 'Back up now'}
            onConfirm={backupNow}
            onClose={() => setAskBackup(false)}
          />
        )}

        {update && (
          <Dialog
            title={`Update available — ${update.version}`}
            body={update.notes || 'A new version of Expense Manager is available in the store.'}
            confirm="Update"
            onConfirm={() => {
              openStore(update.url);
              setUpdate(null);
            }}
            onClose={() => setUpdate(null)}
          />
        )}

        {!!notice && (
          <Dialog title="Google Drive" body={notice} confirm="OK" dismiss="" onConfirm={() => setNotice('')} onClose={() => setNotice('')} />
        )}
      </View>
    </ThemeCtx.Provider>
  );
}

/** Step through months/years. The day tab has nothing to page through. */
function PeriodNav({ period, value, onChange }: { period: Period; value: string; onChange: (v: string) => void }) {
  const c = React.useContext(ThemeCtx);
  const pageable = period === 'month' || period === 'year';
  const atNow = periodLabel(value, period) === periodLabel(today(), period);

  return (
    <View style={[ui.row, { justifyContent: 'center', gap: 14 }]}>
      {pageable && (
        <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => onChange(shiftPeriod(value, period, -1))}>
          <Text style={{ color: c.text, fontSize: 20, paddingHorizontal: 8 }}>‹</Text>
        </Pressable>
      )}
      <Text style={{ color: c.sub, fontWeight: '600', fontSize: 13 }}>{periodLabel(value, period)}</Text>
      {pageable && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next"
          disabled={atNow}
          onPress={() => onChange(shiftPeriod(value, period, 1))}
        >
          <Text style={{ color: atNow ? c.border : c.text, fontSize: 20, paddingHorizontal: 8 }}>›</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Reserved banner strip, capped at 10% of the screen.
 * ponytail: a placeholder, not a live ad. AdMob (react-native-google-mobile-ads) needs a dev build and a publisher
 * account, so drop <BannerAd /> in here once those exist — the layout already leaves the space.
 */
function AdSlot({ height }: { height: number }) {
  const c = React.useContext(ThemeCtx);
  return (
    <View style={[st.ads, { height, backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={{ color: c.sub, fontSize: 11 }}>Ad</Text>
    </View>
  );
}

function Dialog({
  title,
  body,
  confirm,
  dismiss = 'Later',
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirm: string;
  dismiss?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const c = React.useContext(ThemeCtx);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ui.backdrop} onPress={onClose} />
      <View style={st.dialogWrap} pointerEvents="box-none">
        <View style={[st.dialog, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: c.sub, marginTop: 8, lineHeight: 20 }}>{body}</Text>
          <View style={{ marginTop: 18, gap: 8 }}>
            <Button label={confirm} onPress={onConfirm} />
            {!!dismiss && <Button label={dismiss} tone="ghost" onPress={onClose} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value, currency, color }: { label: string; value: number; currency: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '700', marginTop: 2 }}>{money(value, currency)}</Text>
    </View>
  );
}

function HomeList({
  txs,
  period,
  colorOf,
  iconOf,
  onPick,
}: {
  txs: Tx[];
  period: Period;
  colorOf: (n: string) => string;
  iconOf: (n: string) => string;
  onPick: (t: Tx) => void;
}) {
  const c = React.useContext(ThemeCtx);
  const groups = groupForPeriod(txs, period);

  if (!groups.length)
    return (
      <Card style={{ alignItems: 'center', paddingVertical: 44 }}>
        <Text style={{ fontSize: 34 }}>🪙</Text>
        <Text style={{ color: c.text, fontWeight: '700', marginTop: 10 }}>Nothing here yet</Text>
        <Text style={{ color: c.sub, marginTop: 4 }}>Tap + to add your first entry.</Text>
      </Card>
    );

  return (
    <View style={{ gap: 18 }}>
      {groups.map(([key, items]) => {
        const perCurrency = totalsByCurrency(items);
        return (
          <View key={key}>
            <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }]}>
              <Text style={{ color: c.sub, fontWeight: '600', fontSize: 13 }}>
                {period === 'year' ? monthLabel(key) : prettyDate(key)}
              </Text>
              <Text style={{ color: c.sub, fontWeight: '700', fontSize: 13 }}>
                {perCurrency.map((t) => (
                  <Text key={t.currency} style={{ color: t.balance >= 0 ? c.income : c.expense }}>
                    {money(t.balance, t.currency)}
                    {'  '}
                  </Text>
                ))}
              </Text>
            </View>
            <Card style={{ padding: 6 }}>
              {items.map((tx) => (
                <TxRow key={tx.id} tx={tx} colorOf={colorOf} iconOf={iconOf} onPress={() => onPick(tx)} />
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function TxRow({
  tx,
  colorOf,
  iconOf,
  onPress,
  title,
  subtitle,
}: {
  tx: Tx;
  colorOf: (n: string) => string;
  iconOf: (n: string) => string;
  onPress: () => void;
  title?: string;
  subtitle?: string;
}) {
  const c = React.useContext(ThemeCtx);
  const sub = subtitle ?? tx.note;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.txRow, pressed && { backgroundColor: c.card2 }]}>
      <View style={[st.icon, { backgroundColor: colorOf(tx.category) + '22', borderColor: colorOf(tx.category) + '55' }]}>
        <Text style={{ fontSize: 17 }}>{iconOf(tx.category)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600' }}>{title ?? tx.category}</Text>
        {!!sub && (
          <Text numberOfLines={1} style={{ color: c.sub, fontSize: 12, marginTop: 2 }}>
            {sub}
          </Text>
        )}
      </View>
      <Text style={{ color: tx.type === 'income' ? c.income : c.text, fontWeight: '700' }}>
        {tx.type === 'income' ? '+' : '−'}
        {money(tx.amount, tx.currency)}
      </Text>
    </Pressable>
  );
}

function Reports({
  txs,
  cats,
  filter,
  fallbackCurrency,
  colorOf,
  iconOf,
  onPick,
  onExport,
  onPDF,
}: {
  txs: Tx[];
  cats: Category[];
  filter: Filter;
  fallbackCurrency: string;
  colorOf: (n: string) => string;
  iconOf: (n: string) => string;
  onPick: (t: Tx) => void;
  onExport: () => void;
  onPDF: () => void;
}) {
  // the tab filter above already picks the side to chart; 'all' reads as spending.
  const type: TxType = filter === 'income' ? 'income' : 'expense';
  const groups = byCurrency(txs);
  const [drill, setDrill] = useState<{ currency: string; category: string } | null>(null);

  return (
    <View style={{ gap: 16 }}>
      {(groups.length ? groups : [[fallbackCurrency, []] as [string, Tx[]]]).map(([code, items]) => (
        <CurrencyReport
          key={code}
          code={code}
          txs={items}
          cats={cats}
          type={type}
          showHeading={groups.length > 1}
          onOpen={(category) => setDrill({ currency: code, category })}
        />
      ))}

      <Button label="⬇  Export CSV" tone="ghost" onPress={onExport} />
      <Button label="📄  Download PDF" tone="ghost" onPress={onPDF} />

      {drill && (
        <CategoryDetail
          category={drill.category}
          currency={drill.currency}
          type={type}
          txs={txs.filter((t) => t.currency === drill.currency && t.type === type && t.category === drill.category)}
          colorOf={colorOf}
          iconOf={iconOf}
          onPick={onPick}
          onClose={() => setDrill(null)}
        />
      )}
    </View>
  );
}

/** Every entry behind one donut slice, newest first. */
function CategoryDetail({
  category,
  currency,
  type,
  txs,
  colorOf,
  iconOf,
  onPick,
  onClose,
}: {
  category: string;
  currency: string;
  type: TxType;
  txs: Tx[];
  colorOf: (n: string) => string;
  iconOf: (n: string) => string;
  onPick: (t: Tx) => void;
  onClose: () => void;
}) {
  const c = React.useContext(ThemeCtx);
  const rows = [...txs].sort((a, b) => b.date.localeCompare(a.date));
  const total = rows.reduce((a, b) => a + b.amount, 0);

  return (
    <Screen title={`${iconOf(category)}  ${category}`} onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card>
          <Text style={{ color: c.sub, fontSize: 13 }}>
            Total {type === 'expense' ? 'spent' : 'earned'} · {currencyOf(currency).flag} {currency}
          </Text>
          <Text style={{ color: c.text, fontSize: 30, fontWeight: '800', marginTop: 2 }}>{money(total, currency)}</Text>
          <Text style={{ color: c.sub, fontSize: 13, marginTop: 6 }}>
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} in this period
          </Text>
        </Card>

        <Card style={{ padding: 6 }}>
          {rows.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              colorOf={colorOf}
              iconOf={iconOf}
              title={prettyDate(tx.date)}
              subtitle={tx.note}
              onPress={() => {
                onClose();
                onPick(tx);
              }}
            />
          ))}
          {!rows.length && <Text style={{ color: c.sub, padding: 20, textAlign: 'center' }}>No entries.</Text>}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function CurrencyReport({
  code,
  txs,
  cats,
  type,
  showHeading,
  onOpen,
}: {
  code: string;
  txs: Tx[];
  cats: Category[];
  type: TxType;
  showHeading: boolean;
  onOpen: (category: string) => void;
}) {
  const c = React.useContext(ThemeCtx);
  const rows = byCategory(txs, type);
  const find = (n: string) => cats.find((x) => x.name === n);
  const parts = slices(rows.map((r) => ({ ...r, color: find(r.category)?.color ?? c.accent })));
  const sum = rows.reduce((a, b) => a + b.total, 0);

  return (
    <View style={{ gap: 8 }}>
      {showHeading && (
        <Text style={{ color: c.sub, fontWeight: '700', fontSize: 13, paddingHorizontal: 4 }}>
          {currencyOf(code).flag} {currencyOf(code).label}
        </Text>
      )}
      <Card style={{ alignItems: 'center' }}>
        {rows.length ? (
          <>
            <Donut
              data={parts}
              center={
                <>
                  <Text style={{ color: c.sub, fontSize: 12 }}>{type === 'expense' ? 'Spent' : 'Earned'}</Text>
                  <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>{money(sum, code)}</Text>
                </>
              }
            />
            <View style={{ alignSelf: 'stretch', marginTop: 20, gap: 14 }}>
              {parts.map((p) => (
                <Pressable
                  key={p.category}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.category} details`}
                  onPress={() => onOpen(p.category)}
                  style={({ pressed }) => [{ gap: 6, paddingVertical: 4, opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>
                      {find(p.category)?.icon ?? '•'}  {p.category}
                    </Text>
                    <Text style={{ color: c.sub, fontSize: 13 }}>
                      {money(p.total, code)}  ·  {Math.round(p.frac * 100)}%  ›
                    </Text>
                  </View>
                  <Bar frac={p.frac} color={p.color} />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: c.sub, paddingVertical: 30 }}>No {type} in this period.</Text>
        )}
      </Card>
    </View>
  );
}

function Editor({
  tx,
  cats,
  txs,
  defaultCurrency,
  onSave,
  onClose,
  onDelete,
  onAddCategory,
}: {
  tx: Tx | null;
  cats: Category[];
  txs: Tx[];
  defaultCurrency: string;
  onSave: (t: Tx) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddCategory: (c: Category) => void;
}) {
  const c = React.useContext(ThemeCtx);
  const [type, setType] = useState<TxType>(tx?.type ?? 'expense');
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [currency, setCurrency] = useState(tx?.currency ?? defaultCurrency);
  const [category, setCategory] = useState(tx?.category ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx?.date ?? today());
  const [newCat, setNewCat] = useState('');
  const [newIcon, setNewIcon] = useState(ICONS[0]);
  const [error, setError] = useState('');

  const options = cats.filter((x) => x.type === type);
  const hints = useMemo(() => suggestions(txs, type, note), [txs, type, note]);

  const submit = () => {
    const value = Number(amount);
    if (!(value > 0)) return setError('Enter an amount greater than 0.');
    if (!category) return setError('Pick a category.');
    if (!isDate(date)) return setError('Date must be a real YYYY-MM-DD.');
    onSave({ id: tx?.id ?? String(Date.now()), type, amount: value, currency, category, note: note.trim(), date });
  };

  const addCategory = () => {
    const name = newCat.trim();
    if (!name || cats.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.type === type)) return;
    onAddCategory({ name, type, color: PALETTE[cats.length % PALETTE.length], icon: newIcon });
    setCategory(name);
    setNewCat('');
    setNewIcon(ICONS[0]);
  };

  /** Reuse a past entry: fills the note and its category. */
  const applyHint = (hint: { note: string; category: string }) => {
    setNote(hint.note);
    setCategory(hint.category);
    setError('');
  };

  const input = [ui.field, { color: c.text, backgroundColor: c.card2, borderColor: c.border, fontSize: 15 }];

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ui.backdrop} onPress={onClose} />
      <View style={[ui.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 14 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>{tx ? 'Edit entry' : 'New entry'}</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: c.sub, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>

          <Segmented
            options={[
              { key: 'expense' as TxType, label: '−  Expense' },
              { key: 'income' as TxType, label: '+  Income' },
            ]}
            value={type}
            onChange={(t) => {
              setType(t);
              setCategory('');
            }}
          />

          <TextInput
            value={amount}
            onChangeText={(v) => {
              setAmount(v.replace(/[^0-9.]/g, ''));
              setError('');
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={c.sub}
            style={[input, { fontSize: 30, fontWeight: '800', textAlign: 'center', paddingVertical: 16 }]}
          />

          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Currency</Text>
          <CurrencyPicker value={currency} onChange={setCurrency} />

          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Category</Text>
          <View style={[ui.row, { flexWrap: 'wrap', gap: 8 }]}>
            {options.map((o) => (
              <Chip
                key={o.name}
                label={`${o.icon}  ${o.name}`}
                color={o.color}
                active={category === o.name}
                onPress={() => {
                  setCategory(o.name);
                  setError('');
                }}
              />
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <View style={[ui.row, { gap: 8 }]}>
              <TextInput
                value={newCat}
                onChangeText={setNewCat}
                onSubmitEditing={addCategory}
                placeholder="New category…"
                placeholderTextColor={c.sub}
                style={[input, { flex: 1 }]}
              />
              <Chip label={`${newIcon}  Add`} onPress={addCategory} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
              {ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${ic}`}
                  onPress={() => setNewIcon(ic)}
                  style={[
                    st.iconPick,
                    { backgroundColor: c.card2, borderColor: newIcon === ic ? c.accent : c.border },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{ic}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Date</Text>
          <DateField
            label="Date"
            value={date}
            onChange={(v) => {
              setDate(v);
              setError('');
            }}
          />

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={c.sub}
            style={input}
          />
          {/* ponytail: chips are the autocomplete on every platform — one list instead of a native dropdown plus a web <datalist>. */}
          {!!hints.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {hints.map((h) => (
                <Chip key={h.note} label={`${h.note} · ${h.category}`} onPress={() => applyHint(h)} />
              ))}
            </ScrollView>
          )}

          {!!error && <Text style={{ color: c.expense, fontSize: 13 }}>{error}</Text>}

          <Button label={tx ? 'Save changes' : 'Add entry'} onPress={submit} />
          {tx && <Button label="Delete" tone="danger" onPress={() => onDelete(tx.id)} />}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  app: { flex: 1, alignItems: 'center', paddingTop: Platform.OS === 'web' ? 12 : 48 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14 },
  icon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabbar: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSmall: {
    position: 'absolute',
    right: 26,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPick: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ads: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dialogWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 20, borderWidth: 1, padding: 20 },
});
