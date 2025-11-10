# 🏠 Home Screen - Redesign Plan

## 📋 Overview
Transform the Home Screen from mockup/testing data to a **real-time dashboard** that pulls live Spotify data, displays meaningful insights, and caches everything locally in Supabase.

---

## 🎨 Wireframe Layout

```
┌─────────────────────────────────────────────────────────────┐
│ SafeAreaView (Glass Background)                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎵 Header Section                                     │  │
│  │ "Welcome back, [User Name]"                          │  │
│  │ [User Avatar] [Spotify Connected Badge]              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎧 NOW PLAYING CARD (Collapsed/Expanded)             │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ [Album Art]  "Song Name"                        │  │  │
│  │ │               by Artist Name                     │  │  │
│  │ │               [Progress Bar]                     │  │  │
│  │ │               Energy: 75% | Valence: 60%        │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │ [Tap to expand for full audio features]             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📊 QUICK STATS ROW                                   │  │
│  │ ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │  │
│  │ │ 127  │  │ 45   │  │ 12   │  │ 8    │             │  │
│  │ │Tracks│  │Hours │  │Genre │  │Moods │             │  │
│  │ └──────┘  └──────┘  └──────┘  └──────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎨 YOUR TONEPRINT (Mini Visualization)               │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │         [Waveform or Radial Chart]              │  │  │
│  │ │         Energy Profile: High                    │  │  │
│  │ │         Mood Distribution: 60% Happy            │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │ [Tap to view full TonePrint Story →]                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎵 TOP TRACKS THIS WEEK                              │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ 1. [Art] Track Name - Artist      🔥 25 plays   │  │  │
│  │ │ 2. [Art] Track Name - Artist      ⚡ 22 plays   │  │  │
│  │ │ 3. [Art] Track Name - Artist      💚 20 plays   │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │ [View All →]                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🌅 CONTEXTUAL PATTERNS                               │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ "Sunday Evening - High Energy"                  │  │  │
│  │ │ You typically listen to:                        │  │  │
│  │ │ • Pop & Electronic (78 BPM avg)                │  │  │
│  │ │ • Energy: 82% | Valence: 71%                   │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │ [Generate Playlist for Now 🎵]                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔄 SYNC STATUS                                       │  │
│  │ Last synced: 5 minutes ago ✓                        │  │
│  │ [Sync Now] [Settings]                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Data Sources & Storage Strategy

### 1️⃣ NOW PLAYING CARD
**Data Source:** `SpotifyService.getCurrentlyPlaying()`
- **Pull:** Real-time (every 10 seconds when screen is active)
- **Store:** `listening_events` table (when track plays for >30 seconds)
- **Cache:** Local state only (React state)

**Data Fields:**
```typescript
{
  track_name: string,
  artist_name: string,
  album_art: string,
  duration_ms: number,
  progress_ms: number,
  is_playing: boolean,
  // Audio features (fetched separately)
  energy: number,
  valence: number,
  tempo: number
}
```

---

### 2️⃣ QUICK STATS ROW
**Data Source:** Aggregated from `listening_events` table
- **Pull:** On screen mount + refresh every 5 minutes
- **Store:** Cache in `user_preferences` as JSONB (last_stats)
- **Calculate:**
  - Total unique tracks (last 30 days)
  - Total listening hours (sum duration_ms)
  - Unique genres count
  - Unique mood contexts

**SQL Query:**
```sql
SELECT 
  COUNT(DISTINCT track_id) as total_tracks,
  SUM(duration_ms) / 3600000 as total_hours,
  COUNT(DISTINCT UNNEST(genres)) as unique_genres,
  COUNT(DISTINCT user_mood) as unique_moods
FROM listening_events
WHERE user_id = ? 
  AND played_at > NOW() - INTERVAL '30 days'
```

---

### 3️⃣ YOUR TONEPRINT (Mini Viz)
**Data Source:** `PatternAnalysisService.getMusicTasteSummary()`
- **Pull:** On screen mount
- **Store:** Aggregated in `listening_patterns` table
- **Show:**
  - Average energy/valence (as visual arc)
  - Top 3 genres
  - Dominant mood

**Service Method:**
```typescript
getMusicTasteSummary() {
  // Returns:
  {
    avgEnergy: number,
    avgValence: number,
    avgTempo: number,
    topGenres: string[],
    dominantMood: string,
    totalPatterns: number
  }
}
```

---

### 4️⃣ TOP TRACKS THIS WEEK
**Data Source:** `SpotifyService.getTopTracks('short_term', 5)`
- **Pull:** On screen mount + cache for 1 hour
- **Store:** `top_tracks_cache` (new table or in user_preferences as JSONB)
- **Fallback:** Query `listening_events` for most played tracks (last 7 days)

**Storage:**
```sql
-- Add to user_preferences table
top_tracks_cache JSONB DEFAULT '{"tracks": [], "fetched_at": null}'
```

---

### 5️⃣ CONTEXTUAL PATTERNS CARD
**Data Source:** `PatternAnalysisService.getCurrentContextPattern()`
- **Pull:** Based on current time/day/weather
- **Store:** Read from `listening_patterns` table
- **Logic:**
  1. Get current context (day_of_week, time_of_day, weather)
  2. Query patterns table for matching context
  3. Display preferences for this context
  4. Show "Generate Playlist" button

**Query:**
```sql
SELECT * FROM listening_patterns
WHERE user_id = ?
  AND time_of_day = ?
  AND day_of_week = ?
ORDER BY confidence_score DESC
LIMIT 1
```

---

### 6️⃣ SYNC STATUS
**Data Source:** `ListeningHistoryService.lastSyncTime`
- **Pull:** From AsyncStorage or Supabase metadata
- **Store:** `user_preferences.updated_at` or separate `sync_metadata` table

---

## 🔧 New Services Needed

### HomeDataService.ts
```typescript
class HomeDataService {
  // Fetch all home screen data in one go
  async fetchHomeData(): Promise<HomeData>
  
  // Get cached stats
  async getQuickStats(): Promise<QuickStats>
  
  // Get current context and pattern
  async getCurrentContextInfo(): Promise<ContextInfo>
  
  // Cache top tracks
  async cacheTopTracks(tracks: SpotifyTrack[]): Promise<void>
}
```

### CacheService.ts
```typescript
class CacheService {
  // Generic cache with TTL
  async get<T>(key: string): Promise<T | null>
  async set<T>(key: string, value: T, ttlMinutes: number): Promise<void>
  async invalidate(key: string): Promise<void>
}
```

---

## 📊 Database Updates

### New Column in `user_preferences`:
```sql
ALTER TABLE user_preferences 
ADD COLUMN home_cache JSONB DEFAULT '{}';

-- Structure:
{
  "quick_stats": {
    "total_tracks": 127,
    "total_hours": 45,
    "unique_genres": 12,
    "unique_moods": 8,
    "cached_at": "2025-11-10T12:00:00Z"
  },
  "top_tracks": {
    "tracks": [...],
    "cached_at": "2025-11-10T11:30:00Z"
  },
  "last_sync": "2025-11-10T12:05:00Z"
}
```

---

## 🎬 Implementation Steps

### Phase 1: Data Layer (Backend)
- [ ] Create `HomeDataService.ts`
- [ ] Create `CacheService.ts`
- [ ] Add `home_cache` column to `user_preferences`
- [ ] Implement `getQuickStats()` query
- [ ] Implement `getCurrentContextPattern()` in PatternAnalysisService
- [ ] Add caching logic for top tracks

### Phase 2: UI Components
- [ ] Create `NowPlayingCard.tsx` (expandable)
- [ ] Create `QuickStatsRow.tsx` (4 stat boxes)
- [ ] Create `TonePrintMini.tsx` (mini visualization)
- [ ] Create `TopTracksWidget.tsx` (scrollable list)
- [ ] Create `ContextualPatternCard.tsx` (current context + CTA)
- [ ] Create `SyncStatusBar.tsx`

### Phase 3: Integration
- [ ] Refactor `HomeScreen.tsx` to use new components
- [ ] Implement pull-to-refresh
- [ ] Add loading states (skeleton screens)
- [ ] Implement error handling & fallbacks
- [ ] Add navigation to TonePrint Story
- [ ] Connect "Generate Playlist" button

### Phase 4: Polish
- [ ] Add animations (fade in, slide up)
- [ ] Implement card expand/collapse
- [ ] Add haptic feedback
- [ ] Test with no data / empty states
- [ ] Performance optimization (memo, useMemo)

---

## 🎨 UI/UX Enhancements

### Animations
- **Skeleton Loading:** Show shimmer effect while loading
- **Fade In:** Cards fade in sequentially (stagger 100ms)
- **Pull to Refresh:** Standard iOS/Android behavior
- **Card Expansion:** Smooth height animation for Now Playing

### Interactions
- **Now Playing:** Tap to expand/collapse full audio features
- **Quick Stats:** Tap each stat to drill down (navigate to analytics)
- **TonePrint Mini:** Tap to navigate to full TonePrint Story
- **Top Tracks:** Swipe to see more, tap to play
- **Context Pattern:** Tap "Generate Playlist" to create adaptive playlist

### Empty States
- **No Data Yet:** Show "Keep listening to see your patterns"
- **Not Playing:** Show "Not playing - Open Spotify to see live data"
- **No Patterns:** Show "Need more listening history to analyze patterns"

---

## 🚀 Performance Considerations

1. **Lazy Loading:** Load cards progressively (Now Playing → Stats → TonePrint → etc.)
2. **Cache First:** Always show cached data immediately, fetch fresh in background
3. **Debounce:** Limit API calls (e.g., now playing updates max every 10s)
4. **Memoization:** Use `useMemo` for computed stats, `React.memo` for cards
5. **Image Optimization:** Cache album art, use lower resolution for thumbnails

---

## 📱 Mobile-First Design

### Card Sizes
- **Now Playing:** 320px width × 120px height (collapsed), 180px (expanded)
- **Quick Stats:** 4 boxes × 75px width each
- **TonePrint Mini:** 320px × 200px
- **Top Tracks:** 320px × 280px (shows 3 tracks + "View All")
- **Context Pattern:** 320px × 180px

### Spacing
- Between cards: 16px
- Card padding: 16px
- Edge margins: 20px

---

## ✅ Success Metrics

After implementation, we should see:
- ✅ Real-time "Now Playing" updating every 10 seconds
- ✅ Quick stats refreshing automatically
- ✅ All data stored in Supabase for persistence
- ✅ Smooth 60fps animations
- ✅ Sub-2s initial load time (with cache)
- ✅ Zero manual "test" buttons needed

---

## 🔮 Future Enhancements (Post-MVP)

1. **Spotify Mini Player:** Play/pause/skip directly from home screen
2. **Daily Greeting:** "Good morning! Here's what you might like today"
3. **Listening Streaks:** "You've listened 7 days in a row 🔥"
4. **Friend Activity:** See what friends are listening to (if Spotify social enabled)
5. **Discovery Widget:** "3 new tracks match your taste"

---

## 📝 Notes

- Remove all "Test" buttons and mock data
- Keep the "Disconnect Spotify" button at bottom
- Use existing `GlassCard` component for consistency
- Integrate with existing navigation (tab bar)
- Ensure all data respects user privacy settings

---

**Ready to implement? Let's start with Phase 1! 🚀**
