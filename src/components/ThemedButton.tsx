import React from 'react';
import {Pressable, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../theme';
import {glassmorphism} from '../theme/tokens';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  style?: ViewStyle;
};

export default function ThemedButton({title, onPress, disabled, variant = 'primary', style}: Props) {
  const {colors, typography} = useTheme();

  const getButtonStyle = () => {
    if (variant === 'glass') {
      return {
        backgroundColor: colors.surfaceGlass,
        borderColor: colors.borderGlass,
        borderWidth: glassmorphism.border.width,
        ...glassmorphism.shadow.medium,
      };
    }
    
    const backgroundColor =
      variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.accent : 'transparent';
    
    return {
      backgroundColor: disabled ? colors.border : backgroundColor,
      ...glassmorphism.shadow.light,
    };
  };

  const textColor = variant === 'ghost' ? colors.primary : variant === 'glass' ? colors.textPrimary : '#fff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        getButtonStyle(),
        {opacity: pressed ? 0.85 : 1},
        style,
      ]}>
      <Text style={[styles.text, {color: textColor, fontSize: typography.body, fontWeight: '600'}]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {},
});
