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
  byCategory,
  groupByDate,
  inPeriod,
  isDate,
  money,
  slices,
  toCSV,
  today,
  totals,
  type Category,
  type Period,
  type Tx,
  type TxType,
} from './src/logic';
import { Bar, Button, Card, Chip, Donut, Segmented, ThemeCtx, dark, light, s as ui } from './src/ui';

const KEY = 'expense-clone/v1';

type Saved = { txs: Tx[]; cats: Category[]; theme: 'dark' | 'light' };

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

const prettyDate = (d: string) => {
  const t = today();
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
  const [state, setState] = useState<Saved>({ txs: [], cats: DEFAULT_CATEGORIES, theme: 'dark' });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'home' | 'reports'>('home');
  const [period, setPeriod] = useState<Period>('month');
  const [editing, setEditing] = useState<Tx | 'new' | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState((s) => ({ ...s, ...JSON.parse(raw) })))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const c = state.theme === 'dark' ? dark : light;
  const visible = useMemo(() => inPeriod(state.txs, period, today()), [state.txs, period]);
  const sum = totals(visible);
  const colorOf = (name: string) => state.cats.find((x) => x.name === name)?.color ?? c.sub;
  const iconOf = (name: string) => state.cats.find((x) => x.name === name)?.icon ?? '•';

  const save = (tx: Tx) =>
    setState((s) => ({
      ...s,
      txs: s.txs.some((t) => t.id === tx.id) ? s.txs.map((t) => (t.id === tx.id ? tx : t)) : [tx, ...s.txs],
    }));

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

  return (
    <ThemeCtx.Provider value={c}>
      <View style={[st.app, { backgroundColor: c.bg }]}>
        <StatusBar style={state.theme === 'dark' ? 'light' : 'dark'} />
        <View style={{ width: Math.min(width, 620), flex: 1 }}>
          <View style={[ui.row, st.header]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.sub, fontSize: 13 }}>Day-to-day</Text>
              <Text style={{ color: c.text, fontSize: 24, fontWeight: '800' }}>Expenses</Text>
            </View>
            <Pressable
              onPress={() => setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
              style={[st.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <Text style={{ fontSize: 17 }}>{state.theme === 'dark' ? '☀️' : '🌙'}</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 130 }}>
            <Card style={{ marginBottom: 16 }}>
              <Text style={{ color: c.sub, fontSize: 13 }}>Balance</Text>
              <Text style={{ color: c.text, fontSize: 34, fontWeight: '800', marginTop: 2 }}>{money(sum.balance)}</Text>
              <View style={[ui.row, { marginTop: 14, gap: 10 }]}>
                <Stat label="Income" value={sum.income} color={c.income} />
                <Stat label="Expense" value={sum.expense} color={c.expense} />
              </View>
            </Card>

            {tab === 'home' ? (
              <HomeList txs={visible} colorOf={colorOf} iconOf={iconOf} onPick={setEditing} />
            ) : (
              <Reports txs={visible} cats={state.cats} onExport={exportCSV} />
            )}
          </ScrollView>

          <View style={[st.tabbar, { backgroundColor: c.card, borderColor: c.border }]}>
            <Chip label="🧾  Transactions" active={tab === 'home'} onPress={() => setTab('home')} />
            <Chip label="📊  Reports" active={tab === 'reports'} onPress={() => setTab('reports')} />
          </View>

          <Pressable onPress={() => setEditing('new')} style={[st.fab, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.onAccent, fontSize: 30, marginTop: -3 }}>+</Text>
          </Pressable>
        </View>

        {editing && (
          <Editor
            tx={editing === 'new' ? null : editing}
            cats={state.cats}
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
      </View>
    </ThemeCtx.Provider>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: '700', marginTop: 2 }}>{money(value)}</Text>
    </View>
  );
}

function HomeList({
  txs,
  colorOf,
  iconOf,
  onPick,
}: {
  txs: Tx[];
  colorOf: (n: string) => string;
  iconOf: (n: string) => string;
  onPick: (t: Tx) => void;
}) {
  const c = React.useContext(ThemeCtx);
  const groups = groupByDate(txs);

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
      {groups.map(([date, items]) => {
        const t = totals(items);
        return (
          <View key={date}>
            <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }]}>
              <Text style={{ color: c.sub, fontWeight: '600', fontSize: 13 }}>{prettyDate(date)}</Text>
              <Text style={{ color: t.balance >= 0 ? c.income : c.expense, fontWeight: '700', fontSize: 13 }}>
                {money(t.balance)}
              </Text>
            </View>
            <Card style={{ padding: 6 }}>
              {items.map((tx) => (
                <Pressable
                  key={tx.id}
                  onPress={() => onPick(tx)}
                  style={({ pressed }) => [st.txRow, pressed && { backgroundColor: c.card2 }]}
                >
                  <View
                    style={[st.icon, { backgroundColor: colorOf(tx.category) + '22', borderColor: colorOf(tx.category) + '55' }]}
                  >
                    <Text style={{ fontSize: 17 }}>{iconOf(tx.category)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>{tx.category}</Text>
                    {!!tx.note && (
                      <Text numberOfLines={1} style={{ color: c.sub, fontSize: 12, marginTop: 2 }}>
                        {tx.note}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: tx.type === 'income' ? c.income : c.text, fontWeight: '700' }}>
                    {tx.type === 'income' ? '+' : '−'}
                    {money(tx.amount)}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function Reports({ txs, cats, onExport }: { txs: Tx[]; cats: Category[]; onExport: () => void }) {
  const c = React.useContext(ThemeCtx);
  const [type, setType] = useState<TxType>('expense');
  const rows = byCategory(txs, type);
  const find = (n: string) => cats.find((x) => x.name === n);
  const parts = slices(rows.map((r) => ({ ...r, color: find(r.category)?.color ?? c.accent })));
  const sum = rows.reduce((a, b) => a + b.total, 0);

  return (
    <View style={{ gap: 16 }}>
      <Segmented
        options={[
          { key: 'expense' as TxType, label: 'Expenses' },
          { key: 'income' as TxType, label: 'Income' },
        ]}
        value={type}
        onChange={setType}
      />

      <Card style={{ alignItems: 'center' }}>
        {rows.length ? (
          <>
            <Donut
              data={parts}
              center={
                <>
                  <Text style={{ color: c.sub, fontSize: 12 }}>{type === 'expense' ? 'Spent' : 'Earned'}</Text>
                  <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>{money(sum)}</Text>
                </>
              }
            />
            <View style={{ alignSelf: 'stretch', marginTop: 20, gap: 14 }}>
              {parts.map((p) => (
                <View key={p.category} style={{ gap: 6 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>
                      {find(p.category)?.icon ?? '•'}  {p.category}
                    </Text>
                    <Text style={{ color: c.sub, fontSize: 13 }}>
                      {money(p.total)}  ·  {Math.round(p.frac * 100)}%
                    </Text>
                  </View>
                  <Bar frac={p.frac} color={p.color} />
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: c.sub, paddingVertical: 30 }}>No {type} in this period.</Text>
        )}
      </Card>

      <Button label="⬇  Export CSV" tone="ghost" onPress={onExport} />
    </View>
  );
}

function Editor({
  tx,
  cats,
  onSave,
  onClose,
  onDelete,
  onAddCategory,
}: {
  tx: Tx | null;
  cats: Category[];
  onSave: (t: Tx) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddCategory: (c: Category) => void;
}) {
  const c = React.useContext(ThemeCtx);
  const [type, setType] = useState<TxType>(tx?.type ?? 'expense');
  const [amount, setAmount] = useState(tx ? String(tx.amount) : '');
  const [category, setCategory] = useState(tx?.category ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx?.date ?? today());
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');

  const options = cats.filter((x) => x.type === type);

  const submit = () => {
    const value = Number(amount);
    if (!(value > 0)) return setError('Enter an amount greater than 0.');
    if (!category) return setError('Pick a category.');
    if (!isDate(date)) return setError('Date must be a real YYYY-MM-DD.');
    onSave({ id: tx?.id ?? String(Date.now()), type, amount: value, category, note: note.trim(), date });
  };

  const addCategory = () => {
    const name = newCat.trim();
    if (!name || cats.some((x) => x.name.toLowerCase() === name.toLowerCase() && x.type === type)) return;
    onAddCategory({ name, type, color: PALETTE[cats.length % PALETTE.length], icon: ICONS[cats.length % ICONS.length] });
    setCategory(name);
    setNewCat('');
  };

  const input = { ...st.input, color: c.text, backgroundColor: c.card2, borderColor: c.border };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} />
      <View style={[st.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
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
          <View style={[ui.row, { gap: 8 }]}>
            <TextInput
              value={newCat}
              onChangeText={setNewCat}
              onSubmitEditing={addCategory}
              placeholder="New category…"
              placeholderTextColor={c.sub}
              style={[input, { flex: 1 }]}
            />
            <Chip label="Add" onPress={addCategory} />
          </View>

          <Text style={{ color: c.sub, fontSize: 13, fontWeight: '600' }}>Date</Text>
          <TextInput
            value={date}
            onChangeText={(v) => {
              setDate(v);
              setError('');
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.sub}
            style={input}
          />

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={c.sub}
            style={input}
          />

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
  input: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0009' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
  },
});
