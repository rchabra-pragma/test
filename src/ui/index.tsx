import React, { createContext, useContext } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { slices } from '../lib/logic';

export const dark = {
  bg: '#0E1016',
  card: '#171A22',
  card2: '#1F232D',
  text: '#ECEEF3',
  sub: '#8A91A3',
  border: '#262B37',
  accent: '#6C8CFF',
  income: '#38D39F',
  expense: '#FF6B6B',
  onAccent: '#FFFFFF',
};

export const light: typeof dark = {
  bg: '#F4F5F9',
  card: '#FFFFFF',
  card2: '#EEF0F6',
  text: '#12141A',
  sub: '#6B7280',
  border: '#E4E7F0',
  accent: '#4463E8',
  income: '#12A67A',
  expense: '#E04848',
  onAccent: '#FFFFFF',
};

export const ThemeCtx = createContext(dark);
export const useTheme = () => useContext(ThemeCtx);

/** A full-screen page pushed over the app: own header, back arrow, hardware-back aware. */
export function Screen({
  title,
  onClose,
  right,
  children,
}: {
  title: string;
  onClose: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[s.screen, { backgroundColor: c.bg }]}>
        <View style={{ width: Math.min(width, 620), flex: 1 }}>
          <View style={[s.row, s.screenHeader, { borderColor: c.border }]}>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
              <Text style={{ color: c.text, fontSize: 24, lineHeight: 28 }}>‹</Text>
            </Pressable>
            <Text style={{ color: c.text, fontSize: 19, fontWeight: '800', flex: 1 }}>{title}</Text>
            {right}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useTheme();
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  color?: string;
}) {
  const c = useTheme();
  const tint = color ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: active ? tint : c.card2,
          borderColor: active ? tint : c.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? c.onAccent : c.sub, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={[s.segment, { backgroundColor: c.card2, borderColor: c.border }]}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[s.segmentItem, value === o.key && { backgroundColor: c.card }]}
        >
          <Text style={{ color: value === o.key ? c.text : c.sub, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'ghost' | 'danger';
}) {
  const c = useTheme();
  const bg = tone === 'accent' ? c.accent : tone === 'danger' ? c.expense : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderColor: tone === 'ghost' ? c.border : bg, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={{ color: tone === 'ghost' ? c.text : c.onAccent, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** Donut built from one <Circle> per slice via strokeDasharray — no arc maths. */
export function Donut({
  data,
  size = 190,
  thickness = 26,
  center,
}: {
  data: { total: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const c = useTheme();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const parts = slices(data);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.card2} strokeWidth={thickness} fill="none" />
        {parts.map((p, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={p.color}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="butt"
            strokeDasharray={`${p.frac * circumference} ${circumference}`}
            strokeDashoffset={-p.offset * circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View style={{ alignItems: 'center' }}>{center}</View>
    </View>
  );
}

export function Bar({ frac, color }: { frac: number; color: string }) {
  const c = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.card2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(frac * 100, 2)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export const s = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  btn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: 13, borderWidth: 1, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  screen: { flex: 1, alignItems: 'center', paddingTop: Platform.OS === 'web' ? 12 : 48 },
  screenHeader: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1 },
  field: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12 },
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
