import React, { useContext, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { currencyOf, searchCurrencies } from '../lib/currency';
import { ThemeCtx, s as ui } from './index';

/** Dropdown over every supported currency: a field that opens a searchable list. */
export default function CurrencyPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const c = useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const picked = currencyOf(value);
  const matches = useMemo(() => searchCurrencies(query), [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Currency: ${picked.label}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          ui.field,
          ui.row,
          { backgroundColor: c.card2, borderColor: c.border, justifyContent: 'space-between', opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <Text style={{ color: c.text, fontWeight: '600' }}>
          {picked.flag}  {picked.code} — {picked.label} ({picked.symbol})
        </Text>
        <Text style={{ color: c.sub, fontSize: 12 }}>▼</Text>
      </Pressable>

      {open && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <Pressable style={ui.backdrop} onPress={close} />
          <View style={[ui.sheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ padding: 16, gap: 12 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                autoFocus
                placeholder="Search currency…"
                placeholderTextColor={c.sub}
                style={[ui.field, { color: c.text, backgroundColor: c.card2, borderColor: c.border }]}
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
                {matches.map((x) => (
                  <Pressable
                    key={x.code}
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(x.code);
                      close();
                    }}
                    style={({ pressed }) => [
                      ui.row,
                      {
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        gap: 10,
                        backgroundColor: x.code === value ? c.card2 : pressed ? c.card2 : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>{x.flag}</Text>
                    <Text style={{ color: c.text, fontWeight: '700', width: 52 }}>{x.code}</Text>
                    <Text style={{ color: c.sub, flex: 1 }} numberOfLines={1}>
                      {x.label}
                    </Text>
                    <Text style={{ color: c.sub }}>{x.symbol}</Text>
                  </Pressable>
                ))}
                {!matches.length && <Text style={{ color: c.sub, padding: 16, textAlign: 'center' }}>No currency matches “{query}”.</Text>}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
