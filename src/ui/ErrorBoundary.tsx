import React from 'react';
import { Text, View } from 'react-native';
import { Button, dark } from './index';

type Props = { children: React.ReactNode; onReset?: () => void };
type State = { error: Error | null };

/**
 * Last line of defence: a render throw would otherwise leave a white screen in a
 * release build, where there is no redbox. Theme context may itself be gone, so
 * this paints with the dark palette directly.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: dark.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}>
        <Text style={{ fontSize: 34 }}>🧾</Text>
        <Text style={{ color: dark.text, fontSize: 19, fontWeight: '800', textAlign: 'center' }}>Something went wrong</Text>
        <Text style={{ color: dark.sub, textAlign: 'center', lineHeight: 20 }}>
          Your entries are safe on this device. Try again, and reopen the app if it keeps happening.
        </Text>
        <Text style={{ color: dark.sub, fontSize: 11, textAlign: 'center' }} numberOfLines={3}>
          {error.message}
        </Text>
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <Button label="Try again" onPress={this.reset} />
        </View>
      </View>
    );
  }
}
