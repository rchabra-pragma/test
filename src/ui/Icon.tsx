import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from './index';

/**
 * Line icons drawn with react-native-svg.
 *
 * Emoji glyphs render in full colour, pick up a different shape on every platform and ignore the
 * theme, which reads as noise next to the flat cards. These inherit the text colour and scale with
 * the font size instead.
 */
export type IconName = 'download' | 'document' | 'calendar';

const PATHS: Record<IconName, string[]> = {
  download: ['M12 3v12', 'M7.5 10.5 12 15l4.5-4.5', 'M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2'],
  document: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6', 'M9 17h4'],
  calendar: ['M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M8 3v4', 'M16 3v4', 'M4 11h16'],
};

export default function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color ?? c.text}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
