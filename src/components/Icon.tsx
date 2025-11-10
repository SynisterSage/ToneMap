import React from 'react';
import {Text, TextStyle} from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

// Simple icon mapping using emojis and unicode symbols
const iconMap: {[key: string]: string} = {
  // Tab bar icons
  home: '🏠',
  'wave-square': '〰️',
  music: '🎵',
  user: '👤',
  
  // TonePrint screen
  'battery-full': '🔋',
  'battery-half': '🔋',
  'battery-quarter': '🔋',
  smile: '😊',
  meh: '😐',
  frown: '😔',
  'tachometer-alt': '⚡',
  guitar: '🎸',
  headphones: '🎧',
  'volume-up': '🔊',
  
  // Playlists screen
  sun: '☀️',
  brain: '🧠',
  moon: '🌙',
  
  // Profile screen
  'chart-bar': '📊',
  star: '⭐',
  calendar: '📅',
  bell: '🔔',
  'shield-alt': '🛡️',
  palette: '🎨',
  'info-circle': 'ℹ️',
  'chevron-right': '›',
  
  // Home screen
  'list-ul': '📝',
  'chart-line': '📈',
  'calendar-week': '📆',
  
  // Generic
  circle: '●',
};

export default function Icon({name, size = 20, color, style}: IconProps) {
  const icon = iconMap[name] || '•';
  
  return (
    <Text
      style={[
        {
          fontSize: size,
          color: color || '#000',
          lineHeight: size * 1.2,
        },
        style,
      ]}>
      {icon}
    </Text>
  );
}
