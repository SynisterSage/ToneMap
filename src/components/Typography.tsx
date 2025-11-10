import React from 'react';
import {Text, TextProps, StyleSheet} from 'react-native';
import {useTheme} from '../theme';

export function H1(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.h1, {fontSize: typography.h1, color: colors.textPrimary}, props.style]} />;
}

export function H2(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.h2, {fontSize: typography.h2, color: colors.textPrimary}, props.style]} />;
}

export function Body(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.body, {fontSize: typography.body, color: colors.textSecondary}, props.style]} />;
}

const styles = StyleSheet.create({
  h1: {fontWeight: '700'},
  h2: {fontWeight: '600'},
  body: {fontWeight: '400'},
});
