# 🎨 App Preloader & First-Time Tutorial - Implementation Plan

## 📋 Overview
Implement a professional app preloader for all loading states and a skippable first-time tutorial overlay to onboard new users.

---

## 🎬 Part 1: App Preloader

### Purpose
- Show branded loading experience when app starts (before/after authentication)
- Display during any major loading states (Firebase auth check, Spotify connection, etc.)
- Replace the current simple `ActivityIndicator` with a professional, branded experience

### Design Specifications

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                       [ANIMATED LOGO]                        │
│                          ToneMap                             │
│                                                              │
│                    [PULSING DOT LOADER]                      │
│                         ● ● ●                                │
│                                                              │
│                    Loading your vibes...                     │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Features
- **Animated Logo**: Scale + fade-in animation on mount
- **Loading Dots**: Three dots pulsing in sequence
- **Dynamic Messages**: Rotate between loading messages:
  - "Loading your vibes..."
  - "Analyzing patterns..."
  - "Syncing with Spotify..."
  - "Preparing your TonePrint..."
- **Smooth Transitions**: Fade out when loading completes
- **Theme Support**: Works in both dark/light themes

### Technical Implementation

**Component Structure:**
```tsx
<AppPreloader 
  visible={boolean}
  message?: string
  onComplete?: () => void
/>
```

**Usage Scenarios:**
1. **Initial App Load** - While checking Firebase auth
2. **Post-Login Load** - While initializing session
3. **Spotify Connection** - While authenticating with Spotify
4. **Data Sync** - When syncing listening history

---

## 🎓 Part 2: First-Time Tutorial Overlay

### Purpose
- Guide new users through key app features
- Highlight important UI elements (Home, TonePrint, Playlists, Profile tabs)
- Skippable at any time
- Only shows once (tracked in AsyncStorage)

### Design Specifications

```
STEP 1 - HOME TAB
┌─────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ OVERLAY ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓                                                          ▓ │
│ ▓   ┌─────────────────────────────────────────────┐      ▓ │
│ ▓   │ 🏠 Welcome to ToneMap!                      │      ▓ │
│ ▓   │                                              │      ▓ │
│ ▓   │ This is your Home screen - see what         │      ▓ │
│ ▓   │ you're listening to right now and           │      ▓ │
│ ▓   │ discover patterns in your music taste       │      ▓ │
│ ▓   │                                              │      ▓ │
│ ▓   │           [Next] [Skip Tutorial]            │      ▓ │
│ ▓   └─────────────────────────────────────────────┘      ▓ │
│ ▓                         ↓                               ▓ │
│ ▓              ┌──────────────────────┐                   ▓ │
│ ▓              │   HOME TAB (Highlight) │                  ▓ │
│ ▓              └──────────────────────┘                   ▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────────────────────┘

STEP 2 - TONEPRINT TAB
[Similar overlay highlighting TonePrint tab with explanation]

STEP 3 - PLAYLISTS TAB
[Similar overlay highlighting Playlists tab with explanation]

STEP 4 - PROFILE TAB
[Similar overlay highlighting Profile tab with explanation]
```

### Tutorial Steps

**Step 1: Home Screen** 
- Highlight: Bottom tab bar - Home icon
- Message: "Welcome to ToneMap! This is your Home screen - see what you're listening to right now and discover patterns in your music taste 🎵"
- Duration: User-controlled

**Step 2: TonePrint Screen**
- Highlight: Bottom tab bar - TonePrint icon
- Message: "Your TonePrint is a visual story of your music DNA - analyze your listening habits and see your vibe profile 🎨"
- Duration: User-controlled

**Step 3: Playlists Screen**
- Highlight: Bottom tab bar - Playlists icon
- Message: "Create smart playlists based on your mood, energy, or specific moments using AI-powered suggestions 🎧"
- Duration: User-controlled

**Step 4: Profile Screen**
- Highlight: Bottom tab bar - Profile icon
- Message: "Manage your account, view stats, and connect/disconnect your Spotify account here ⚙️"
- Duration: User-controlled

**Step 5: Complete**
- Full screen message: "You're all set! Start exploring your music journey 🚀"
- Auto-dismiss after 2 seconds or tap

### Features
- **Semi-transparent Overlay**: 70% black overlay with cutouts for highlighted elements
- **Animated Tooltip**: Glass card with text + arrow pointing to highlighted element
- **Skip Button**: Available on every step
- **Progress Indicator**: "Step 1 of 4" at bottom
- **Smooth Transitions**: Fade between steps
- **One-time Only**: Tracked in AsyncStorage with key `hasSeenTutorial`
- **Replayable**: Add "Show Tutorial" option in Profile > Settings

### Technical Implementation

**Component Structure:**
```tsx
<TutorialOverlay 
  visible={boolean}
  onComplete={() => void}
  onSkip={() => void}
/>
```

**Storage Key:**
```typescript
// AsyncStorage
'@ToneMap:hasSeenTutorial' => 'true' | 'false'
```

**Usage:**
```tsx
// In App.tsx or MainNavigator
const [showTutorial, setShowTutorial] = useState(false);
const [tutorialChecked, setTutorialChecked] = useState(false);

useEffect(() => {
  checkTutorialStatus();
}, [isAuthenticated]);

async function checkTutorialStatus() {
  if (!isAuthenticated || tutorialChecked) return;
  
  const hasSeenTutorial = await AsyncStorage.getItem('@ToneMap:hasSeenTutorial');
  
  if (hasSeenTutorial !== 'true') {
    // Small delay to let the main screen render first
    setTimeout(() => {
      setShowTutorial(true);
    }, 1000);
  }
  
  setTutorialChecked(true);
}

async function handleTutorialComplete() {
  await AsyncStorage.setItem('@ToneMap:hasSeenTutorial', 'true');
  setShowTutorial(false);
}
```

---

## 📁 File Structure

```
src/
  components/
    AppPreloader.tsx        ← New: Animated preloader component
    TutorialOverlay.tsx     ← New: First-time tutorial overlay
    TutorialStep.tsx        ← New: Individual tutorial step component
```

---

## 🎨 Component Specifications

### AppPreloader.tsx

**Props:**
```typescript
interface AppPreloaderProps {
  visible: boolean;
  message?: string;
  variant?: 'default' | 'minimal';
}
```

**Animations:**
- Logo: Scale from 0.8 to 1.0 + fade in over 600ms
- Loading dots: Sequential pulse animation (stagger 200ms)
- Message: Fade in/out when changing (300ms)

**Loading Messages (rotate every 2s):**
```typescript
const loadingMessages = [
  "Loading your vibes...",
  "Analyzing patterns...",
  "Syncing with Spotify...",
  "Preparing your TonePrint...",
];
```

---

### TutorialOverlay.tsx

**Props:**
```typescript
interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}
```

**Tutorial Steps Data:**
```typescript
const tutorialSteps = [
  {
    id: 1,
    title: "Welcome to ToneMap!",
    message: "This is your Home screen - see what you're listening to right now and discover patterns in your music taste 🎵",
    highlightTab: 'home',
    tooltipPosition: 'top',
  },
  {
    id: 2,
    title: "Your TonePrint",
    message: "Your TonePrint is a visual story of your music DNA - analyze your listening habits and see your vibe profile 🎨",
    highlightTab: 'toneprint',
    tooltipPosition: 'top',
  },
  {
    id: 3,
    title: "Smart Playlists",
    message: "Create smart playlists based on your mood, energy, or specific moments using AI-powered suggestions 🎧",
    highlightTab: 'playlists',
    tooltipPosition: 'top',
  },
  {
    id: 4,
    title: "Your Profile",
    message: "Manage your account, view stats, and connect/disconnect your Spotify account here ⚙️",
    highlightTab: 'profile',
    tooltipPosition: 'top',
  },
];
```

**Layout:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <View style={styles.overlay}>
    {/* Dimmed background */}
    <View style={styles.dimBackground} />
    
    {/* Highlight cutout for current tab */}
    <View style={styles.highlightRegion} />
    
    {/* Tooltip card */}
    <GlassCard style={styles.tooltip}>
      <H2>{step.title}</H2>
      <Body>{step.message}</Body>
      
      <View style={styles.controls}>
        <Caption>Step {currentStep} of {totalSteps}</Caption>
        <View style={styles.buttons}>
          <ThemedButton title="Skip" onPress={onSkip} variant="ghost" />
          <ThemedButton 
            title={isLastStep ? "Let's Go!" : "Next"} 
            onPress={handleNext} 
          />
        </View>
      </View>
    </GlassCard>
    
    {/* Arrow pointing to highlighted element */}
    <View style={styles.arrow} />
  </View>
</Modal>
```

---

## 🔄 Integration Points

### 1. App.tsx - Initial Load
```tsx
// Replace existing loading view
if (isLoading) {
  return <AppPreloader visible={true} />;
}
```

### 2. MainNavigator - Post-Auth Tutorial
```tsx
// In MainNavigator.tsx
const [showTutorial, setShowTutorial] = useState(false);

useEffect(() => {
  checkAndShowTutorial();
}, []);

return (
  <>
    <BottomTabNavigator {...props} />
    <TutorialOverlay
      visible={showTutorial}
      onComplete={handleTutorialComplete}
      onSkip={handleTutorialSkip}
    />
  </>
);
```

### 3. Profile Settings - Replay Tutorial
```tsx
// In ProfileScreen.tsx
<TouchableOpacity onPress={replayTutorial}>
  <Icon name="help-circle" />
  <Body>Show Tutorial Again</Body>
</TouchableOpacity>
```

---

## ✅ User Flows

### Flow 1: New User (First Launch)
```
1. Open App
   ↓
2. [AppPreloader] - "Loading your vibes..."
   ↓
3. Firebase Auth Check (not logged in)
   ↓
4. FirebaseAuthScreen
   ↓
5. User signs in
   ↓
6. [AppPreloader] - "Syncing with Spotify..."
   ↓
7. Session initialized
   ↓
8. MainNavigator loads
   ↓
9. [TutorialOverlay] - Step 1 appears automatically
   ↓
10. User goes through tutorial or skips
```

### Flow 2: Returning User
```
1. Open App
   ↓
2. [AppPreloader] - "Loading your vibes..."
   ↓
3. Firebase Auth Check (already logged in)
   ↓
4. [AppPreloader] - "Syncing with Spotify..."
   ↓
5. Session initialized
   ↓
6. MainNavigator loads (no tutorial)
```

### Flow 3: User Requests Tutorial Replay
```
1. Profile Screen → Settings
   ↓
2. Tap "Show Tutorial Again"
   ↓
3. [TutorialOverlay] appears
   ↓
4. Tutorial plays (doesn't reset hasSeenTutorial flag)
```

---

## 🎯 Implementation Checklist

### Phase 1: AppPreloader
- [ ] Create `AppPreloader.tsx` component
- [ ] Implement logo scale/fade animation
- [ ] Add sequential dot pulsing animation
- [ ] Add rotating loading messages
- [ ] Integrate into `App.tsx` loading state
- [ ] Test theme compatibility (dark/light)

### Phase 2: TutorialOverlay
- [ ] Create `TutorialOverlay.tsx` component
- [ ] Create `TutorialStep.tsx` sub-component
- [ ] Implement semi-transparent overlay
- [ ] Add spotlight/highlight effect for tabs
- [ ] Create animated tooltip cards
- [ ] Add step navigation (Next/Skip)
- [ ] Add progress indicator
- [ ] Implement AsyncStorage tracking

### Phase 3: Integration
- [ ] Add tutorial check in `MainNavigator.tsx`
- [ ] Add "Show Tutorial" option in Profile Settings
- [ ] Test complete new user flow
- [ ] Test returning user flow
- [ ] Test tutorial skip functionality
- [ ] Test tutorial replay functionality

---

## 🎨 Design Tokens

### Colors (from theme)
```typescript
// Preloader
background: colors.background      // #0a0a0a (dark) / #ffffff (light)
primaryColor: colors.primary       // #8b5cf6 (purple)
textColor: colors.text            // #ffffff (dark) / #1a1a1a (light)

// Tutorial Overlay
overlayBackground: 'rgba(0, 0, 0, 0.85)'
highlightBorder: colors.primary    // #8b5cf6
tooltipBackground: glassmorphism.background
```

### Animations
```typescript
// Preloader
logoScale: { from: 0.8, to: 1.0, duration: 600 }
logoOpacity: { from: 0, to: 1, duration: 600 }
dotPulse: { scale: [1, 1.3, 1], duration: 800, stagger: 200 }
messageRotate: { interval: 2000, fadeTransition: 300 }

// Tutorial
overlayFade: { duration: 300 }
tooltipSlide: { from: 'bottom', offset: 50, duration: 400 }
stepTransition: { duration: 300 }
```

---

## 📱 Component Usage Examples

### Example 1: Basic Preloader
```tsx
import AppPreloader from './src/components/AppPreloader';

function App() {
  const [loading, setLoading] = useState(true);
  
  return (
    <>
      <AppPreloader visible={loading} />
      {!loading && <MainApp />}
    </>
  );
}
```

### Example 2: Preloader with Custom Message
```tsx
<AppPreloader 
  visible={isConnecting} 
  message="Connecting to Spotify..."
/>
```

### Example 3: Tutorial with Callbacks
```tsx
import TutorialOverlay from './src/components/TutorialOverlay';

function MainNavigator() {
  const [showTutorial, setShowTutorial] = useState(false);
  
  const handleComplete = async () => {
    await AsyncStorage.setItem('@ToneMap:hasSeenTutorial', 'true');
    setShowTutorial(false);
  };
  
  const handleSkip = () => {
    handleComplete(); // Mark as seen even if skipped
  };
  
  return (
    <>
      <BottomTabs />
      <TutorialOverlay
        visible={showTutorial}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </>
  );
}
```

---

## 🚀 Next Steps

Once you review this plan, I'll:
1. Create the `AppPreloader` component with animations
2. Create the `TutorialOverlay` component with step navigation
3. Integrate both into the app's navigation flow
4. Add AsyncStorage tracking for tutorial completion
5. Add replay option in Profile settings

**Ready to proceed?** Let me know if you want to adjust any design details, animations, or user flow!
