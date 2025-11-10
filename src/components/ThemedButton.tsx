import React from 'react';
import {Pressable, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import {useTheme} from '../theme';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
};

export default function ThemedButton({title, onPress, disabled, variant = 'primary', style}: Props) {
  const {colors, typography} = useTheme();

  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.accent : 'transparent';

  const textColor = variant === 'ghost' ? colors.primary : '#fff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        {backgroundColor: disabled ? colors.border : backgroundColor, opacity: pressed ? 0.9 : 1},
        style,
      ]}>
      <Text style={[styles.text, {color: textColor, fontSize: typography.body}]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {fontWeight: '600'},
});
