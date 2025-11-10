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

export function H3(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.h3, {fontSize: typography.body * 1.1, color: colors.textPrimary}, props.style]} />;
}

export function Body(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.body, {fontSize: typography.body, color: colors.textSecondary}, props.style]} />;
}

export function Small(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.small, {fontSize: typography.body * 0.85, color: colors.textSecondary}, props.style]} />;
}

export function Caption(props: TextProps) {
  const {typography, colors} = useTheme();
  return <Text {...props} style={[styles.caption, {fontSize: typography.body * 0.85, color: colors.textSecondary}, props.style]} />;
}

const styles = StyleSheet.create({
  h1: {fontWeight: '700'},
  h2: {fontWeight: '600'},
  h3: {fontWeight: '600'},
  body: {fontWeight: '400'},
  small: {fontWeight: '400'},
  caption: {fontWeight: '400'},
});
