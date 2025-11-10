import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import Icon from '../components/Icon';
import {useTheme} from '../theme';
import {glassmorphism} from '../theme/tokens';

export default function GlassTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const {colors, spacing} = useTheme();

  const getIcon = (routeName: string) => {
    const iconMap: {[key: string]: string} = {
      Home: 'home',
      TonePrint: 'wave-square',
      Playlists: 'music',
      Profile: 'user',
    };
    return iconMap[routeName] || 'circle';
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceGlass,
          borderTopColor: colors.borderGlass,
        },
        glassmorphism.shadow.heavy,
      ]}>
      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? {selected: true} : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isFocused ? colors.primary : 'transparent',
                },
              ]}>
              <Icon
                name={getIcon(route.name)}
                size={24}
                color={isFocused ? '#FFFFFF' : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? colors.primary : colors.textSecondary,
                  fontWeight: isFocused ? '600' : '400',
                },
              ]}>
              {String(label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
  },
});
