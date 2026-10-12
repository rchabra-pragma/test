import React, { useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { panelLayout, type Anchor } from '../lib/anchor';
import { currencyOf, searchCurrencies } from '../lib/currency';
import { ThemeCtx, s as ui } from './index';

/** Dropdown over every supported currency: a field that opens a searchable list. */
export default function CurrencyPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string;
  onChange: (code: string) => void;
  /** Trigger only, borderless — for embedding inside another field such as the amount box. */
  compact?: boolean;
}) {
  const c = useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const trigger = useRef<View>(null);
  const { width: winW, height: winH } = useWindowDimensions();
  const picked = currencyOf(value);
  const matches = useMemo(() => searchCurrencies(query), [query]);

  /** Measure first, then open, so the panel renders in the right place on its very first frame. */
  const openPanel = () => {
    trigger.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {compact ? (
        <Pressable
          ref={trigger}
          accessibilityRole="button"
          accessibilityLabel={`Currency: ${picked.label}`}
          onPress={openPanel}
          style={({ pressed }) => [
            ui.row,
            { gap: 4, paddingRight: 10, marginRight: 10, borderRightWidth: 1, borderColor: c.border, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={{ fontSize: 15 }}>{picked.flag}</Text>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{picked.code}</Text>
          <Text style={{ color: c.sub, fontSize: 10 }}>▼</Text>
        </Pressable>
      ) : (
        <Pressable
          ref={trigger}
          accessibilityRole="button"
          accessibilityLabel={`Currency: ${picked.label}`}
          onPress={openPanel}
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
      )}

      {open && anchor && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <Pressable style={ui.backdrop} onPress={close} />
          <View
            style={[
              {
                position: 'absolute',
                borderWidth: 1,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: c.card,
                borderColor: c.border,
                elevation: 8,
              },
              panelLayout(anchor, winW, winH),
            ]}
          >
            <View style={{ padding: 10, gap: 10, flexShrink: 1 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                autoFocus
                placeholder="Search currency…"
                placeholderTextColor={c.sub}
                style={[ui.field, { color: c.text, backgroundColor: c.card2, borderColor: c.border }]}
              />
              <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
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
