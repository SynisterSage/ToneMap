ToneMap UI Style Guide
======================

This document summarizes the core design tokens and component rules used across the app.

Color tokens
- primary: main brand color used for primary actions.
- accent: secondary action color.
- background: app background.
- surface: card / panel background.
- textPrimary / textSecondary: hierarchy for typography.
- border: separators and disabled backgrounds.

Spacing
- xsmall: 4
- small: 8
- medium: 16
- large: 24
- xlarge: 32

Typography
- H1: 32 (weight 700)
- H2: 24 (weight 600)
- Body: 16 (weight 400)
- Small: 12

Buttons
- Primary: filled with primary color, white text, rounded corners.
- Secondary: filled with accent color, white text.
- Ghost: transparent background, primary colored text.
- Padding: vertical 12, horizontal 16.

Light/Dark
- Themes are provided via `ThemeProvider` and components should use `useTheme()` to pull colors, spacing and typography.

Usage
- Import `useTheme()` from `src/theme` to get `colors`, `spacing`, and `typography`.
- Use `ThemedButton` and `Typography` components for consistent UI.
