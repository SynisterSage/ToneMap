# ToneMap: Context-Aware Music Intelligence Roadmap

## 🎯 **ToneMap Vision: Context-Aware Music Intelligence**

### **Core Concept**
Build an AI that learns your listening patterns across multiple dimensions:
- **WHEN**: Time of day, day of week, season, weather
- **WHY**: Activity, mood, location, context
- **WHAT**: Genres, energy, mood, artists, audio features

Then use this intelligence to:
1. Create **dynamic TonePrint Stories** that evolve with you
2. Generate **context-aware playlists** that predict what you need

---

## 🚀 **REVISED MVP ROADMAP**

### **PHASE 1: Intelligent Data Collection** (Week 1-2)
Build the foundation for learning user behavior.

#### **1.1 Enhanced Listening History Storage**
```typescript
interface ListeningEvent {
  trackId: string;
  timestamp: Date;

  // Audio features (from your existing analyzer)
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  // ... all other features

  // Context (what we'll learn from)
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'monday' | 'tuesday' | ... ;
  weather?: 'sunny' | 'rainy' | 'cloudy' | 'snowy';
  location?: 'home' | 'work' | 'gym' | 'commute';
  userActivity?: 'working' | 'exercising' | 'relaxing' | 'commuting';
  userMood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'stressed';

  // Engagement metrics
  skipped: boolean;
  playDuration: number; // ms
  repeated: boolean;
}
```
yjKhJkaCOVPVBLTE
**Implementation:**
- Store every `recently-played` track with full context
- Build a **local SQLite database** or use **Realm** for complex queries
- Weekly sync to capture ~1000-2000 listening events

---

#### **1.2 Context Detection System**
**Auto-detect context from available data:**

```typescript
// services/ContextDetector.ts

class ContextDetector {
  // Automatic detections
  detectTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night'
  detectDayOfWeek(): string
  detectWeather(): Promise<WeatherCondition> // Using API
  detectActivity(): 'moving' | 'stationary' // From device motion sensors

  // User-provided context (optional quick-tags)
  askUserContext(): void // Bottom sheet: "What are you doing? 🏋️ 💼 🧘 🚗"
}
```

**Weather Integration:**
```bash
npm install @react-native-community/geolocation
# Use OpenWeatherMap API (free tier: 1000 calls/day)
```

**Activity Detection:**
```bash
npm install react-native-sensors
# Detect: walking, running, stationary, driving
```

---

#### **1.3 Pattern Learning Engine**
Build ML-style pattern recognition:

```typescript
// services/PatternLearner.ts

interface ListeningPattern {
  context: {
    timeOfDay?: string;
    dayOfWeek?: string;
    weather?: string;
    activity?: string;
    mood?: string;
  };

  // What you typically listen to in this context
  typicalFeatures: {
    avgEnergy: number;
    avgValence: number;
    avgTempo: number;
    topGenres: string[];
    topArtists: string[];
  };

  confidence: number; // 0-1, based on sample size
  sampleSize: number;
}

class PatternLearner {
  // Learn patterns from history
  learnPatterns(events: ListeningEvent[]): ListeningPattern[]

  // Predict what user wants to hear now
  predictCurrentPreference(currentContext: Context): ListeningPattern

  // Find anomalies
  detectNewTrends(): Insight[]
}
```

**Example Patterns Detected:**
- "Monday mornings: 85% high-energy, 120+ BPM (workout music)"
- "Rainy afternoons: 70% acoustic, low energy (chill vibes)"
- "Friday nights: 90% high valence, danceable (party mode)"
- "Late nights (2-6am): 60% melancholic, introspective"

---

### **PHASE 2: Dynamic TonePrint Stories** (Week 2-3)
Evolve your existing story system into an **intelligent narrative**.

#### **2.1 Context-Aware Story Generation**
**Current**: Static 8-scene story based on aggregate data
**New**: Dynamic story that changes based on **when you view it**

```typescript
// services/StoryGenerator.ts

interface StoryScene {
  id: string;
  title: string;
  narrative: string; // AI-generated text
  visualization: 'chart' | 'gradient' | 'particles' | 'timeline';
  data: any;
  insight: string; // Key takeaway
}

class StoryGenerator {
  generateStory(
    tonePrint: TonePrint,
    patterns: ListeningPattern[],
    timeframe: 'today' | 'week' | 'month' | 'all-time'
  ): StoryScene[]
}
```

**Example Dynamic Story (Morning View):**
```
Scene 1: "Good Morning! ☀️"
"You're a morning energizer! 78% of your 6-9am listening is high-energy tracks."
[Bar chart: Energy by time of day]

Scene 2: "Your Monday Motivation 💪"
"On weekdays, you start with 120+ BPM. Weekends? 40% slower and chiller."
[Split comparison visualization]

Scene 3: "Weather Warrior 🌦️"
"Rainy days shift your mood -23% valence. You embrace the melancholy."
[Weather correlation chart]

Scene 4: "Your Weekly Rhythm 📊"
"Peak energy: Wed-Fri. Recovery mode: Sundays (65% acoustic)."
[Weekly heatmap]

Scene 5: "Vibe Prediction 🔮"
"Right now (Monday 9am, Sunny): Model predicts you want HIGH ENERGY tracks."
[Real-time prediction]

Scene 6: "Your Evolution 📈"
"This month vs last: +15% diversity, exploring 3 new genres."
[Timeline comparison]

Scene 7: "Hidden Patterns 🕵️"
"You listen to jazz 80% more when stressed. Music therapy at work!"
[Correlation insights]

Scene 8: "What's Next? 🎯"
"Based on your patterns, here are playlists for today..."
[CTA to playlists]
```

---

#### **2.2 AI-Generated Insights**
Use simple heuristics to generate insights:

```typescript
// services/InsightGenerator.ts

interface Insight {
  type: 'pattern' | 'anomaly' | 'evolution' | 'correlation';
  title: string;
  description: string;
  emoji: string;
  confidence: number;
}

class InsightGenerator {
  generateInsights(
    patterns: ListeningPattern[],
    history: TonePrint[]
  ): Insight[]

  // Example insights:
  // - "You're 23% happier on Fridays (based on valence)"
  // - "Rainy days = acoustic music (82% correlation)"
  // - "Your workout playlist timing is perfectly consistent"
  // - "New trend detected: You're exploring K-pop this week"
}
```

---

#### **2.3 Shareable Story Cards**
Export stories as beautiful images:

```bash
npm install react-native-view-shot
```

**Features:**
- Each scene → Instagram-ready card
- Add branding: "My ToneMap Story 🎵"
- Share to social media
- Viral growth mechanic

---

### **PHASE 3: Context-Aware Playlist Generation** (Week 3-4)
The **killer feature**: Playlists that understand you.

#### **3.1 Smart Playlist Engine**
```typescript
// services/SmartPlaylistEngine.ts

interface PlaylistRequest {
  // User request
  name: string;
  duration?: number; // minutes

  // Auto-detected context
  currentContext: Context;

  // Optional overrides
  targetMood?: 'energize' | 'focus' | 'relax' | 'party';
  targetActivity?: 'workout' | 'study' | 'sleep' | 'commute';
}

class SmartPlaylistEngine {
  // Generate playlist using ML predictions
  generatePlaylist(request: PlaylistRequest): Promise<Playlist>

  // Use Spotify's recommendation API with smart parameters
  async getRecommendations(
    seedTracks: string[],
    targetFeatures: AudioFeatures,
    context: Context
  ): Promise<Track[]>
}
```

---

#### **3.2 Automatic Playlist Types**

**1. "Right Now" Playlist** 🎯
- Generated based on **current context** (time, weather, activity)
- Updates every hour
- "Monday Morning Power-Up" vs "Sunday Evening Wind-Down"

**2. "For This Moment" Playlists** ⚡
Quick-access contextual playlists:
```
☀️ Morning Fuel (6-9am)
💼 Focus Flow (9am-5pm, high instrumentalness)
🏃 Workout Power (high energy + 140+ BPM)
🌙 Night Vibes (10pm+, low energy)
🌧️ Rainy Day Chill (when weather = rain)
😴 Sleep Sounds (ambient, <80 BPM)
```

**3. "Discovery Mix"** 🔍
- Find tracks that **expand** your TonePrint
- If you're 90% rock, recommend indie-electronic crossover
- Gradually introduce new genres based on audio similarity

**4. "Throwback"** ⏪
- Tracks matching your current context from **different eras**
- "Monday morning energy from the 80s"

**5. "Energy Journey"** 🎢
Progressive playlists:
- **Wake-Up**: Starts 40% energy → ramps to 85% over 30min
- **Wind-Down**: Starts 70% → drops to 30% for sleep
- **Workout**: Matches tempo to running cadence (160-180 BPM)

**6. "Mood Shift"** 🎭
- Feeling down? Playlist that gradually increases valence
- Start with your current mood, gently lift you up
- Backed by music therapy research

---

#### **3.3 Playlist Intelligence Features**

**A. Smart Seeding**
```typescript
// Don't just use random top tracks as seeds
// Use CONTEXTUAL seeds
function getSmartSeeds(context: Context, userHistory: ListeningEvent[]): Track[] {
  // Filter history by similar context
  const relevantTracks = userHistory.filter(event =>
    event.timeOfDay === context.timeOfDay &&
    event.dayOfWeek === context.dayOfWeek
  );

  // Pick highest-engagement tracks (not skipped, fully played)
  return relevantTracks
    .filter(e => !e.skipped && e.playDuration > e.track.duration * 0.7)
    .sort((a, b) => b.playDuration - a.playDuration)
    .slice(0, 5);
}
```

**B. Dynamic Tuning**
```typescript
// Call Spotify recommendations with calculated targets
const targetFeatures = {
  target_energy: predictedPattern.avgEnergy,
  target_valence: predictedPattern.avgValence,
  target_tempo: predictedPattern.avgTempo,
  target_danceability: predictedPattern.avgDanceability,
  target_acousticness: predictedPattern.avgAcousticness,

  // Add variance for exploration
  min_energy: predictedPattern.avgEnergy - 0.2,
  max_energy: predictedPattern.avgEnergy + 0.2,
};
```

**C. Negative Filtering**
- Track what user **skips**
- Never recommend skipped tracks again
- Learn skip patterns: "User skips country 95% of the time"

---

#### **3.4 Playlist UI/UX**

**Main Playlist Screen:**
```
┌─────────────────────────────────┐
│  🎯 Your Playlists              │
├─────────────────────────────────┤
│  ⚡ RIGHT NOW                   │
│  Monday Morning Energy          │
│  Generated 8:32am • 25 tracks   │
│  [Play] [Save to Spotify]       │
├─────────────────────────────────┤
│  FOR THIS MOMENT                │
│  ☀️ Morning Fuel                │
│  💼 Focus Flow                   │
│  🏃 Workout Power                │
│  🌙 Night Vibes                  │
│  [See All]                       │
├─────────────────────────────────┤
│  ENERGY JOURNEYS                │
│  🎢 Wake Up Easy (30min)        │
│  🌊 Wind Down (45min)            │
│  💪 Running Tempo (60min)        │
├─────────────────────────────────┤
│  MOODS & MOMENTS                │
│  😊 Mood Boost                   │
│  🧘 Deep Focus                   │
│  🎉 Party Mode                   │
│  🔍 Discover New                 │
└─────────────────────────────────┘
```

**Smart Notifications:**
- "Good morning! Your Monday Morning Energy playlist is ready ☀️"
- "It's raining ☔ - We made you a Rainy Day Chill playlist"
- "Workout time? 💪 Your Running Tempo playlist is updated"

---

### **PHASE 4: Learning & Feedback Loop** (Week 4-5)
Make the system **smarter over time**.

#### **4.1 User Feedback Collection**
```typescript
interface PlaylistFeedback {
  playlistId: string;
  liked: boolean;
  tracksSkipped: string[];
  tracksLoved: string[];
  overallRating: 1 | 2 | 3 | 4 | 5;
}

// After playlist finishes
function collectFeedback(): void {
  showBottomSheet({
    title: "How was your playlist?",
    options: ["😍 Loved it", "👍 Good", "😐 Okay", "👎 Not for me"],
    followUp: "What would make it better?"
  });
}
```

**Use feedback to:**
- Increase/decrease confidence scores
- Adjust pattern weights
- Blacklist disliked tracks/artists
- Boost loved characteristics

---

#### **4.2 Continuous Pattern Refinement**
```typescript
class AdaptiveLearner {
  // Weekly retraining
  updatePatterns(): void {
    // Fetch latest listening history
    // Re-run pattern detection
    // Compare to previous patterns
    // Notify user of changes
  }

  // Real-time learning
  learnFromPlaylistEngagement(
    playlist: Playlist,
    engagement: PlaylistFeedback
  ): void {
    if (engagement.liked) {
      // Strengthen pattern
      increaseConfidence(playlist.context);
    } else {
      // Weaken pattern
      decreaseConfidence(playlist.context);
    }
  }
}
```

---

#### **4.3 Anomaly Detection & Alerts**
```typescript
interface Anomaly {
  type: 'new-genre' | 'mood-shift' | 'energy-change' | 'time-shift';
  description: string;
  significance: number; // 0-1
}

// Examples:
"You've listened to Jazz 400% more this week. New interest? 🎷"
"Your energy levels are 25% lower than usual. Everything okay? 💙"
"New pattern detected: You're now a night owl! 🦉"
"You've discovered 8 new artists this week. Explorer mode! 🔍"
```

---

### **PHASE 5: Advanced Intelligence** (Week 5-6)
Next-level features that make this truly special.

#### **5.1 Mood Prediction & Intervention**
```typescript
class MoodPredictor {
  // Predict user mood from listening patterns
  predictMood(recentTracks: ListeningEvent[]): Mood

  // Detect concerning patterns
  detectMentalHealthRisks(): Alert[] {
    // If 7+ days of only melancholic music
    // If energy drops significantly
    // If sleep patterns disrupted (late-night listening)

    return [
      {
        type: 'concern',
        message: "You've been listening to a lot of sad music lately. Want a mood boost?",
        action: 'generate-uplifting-playlist'
      }
    ];
  }
}
```

**Ethical note:** Frame as supportive, not diagnostic.

---

#### **5.2 Social Features (Optional)**
```typescript
// Anonymous sharing without full social network

interface MusicTwin {
  id: string;
  compatibility: number; // 0-100
  sharedGenres: string[];
  sharedVibes: string[];
  tonePrintSimilarity: number;
}

// Generate shareable code
function generateShareCode(tonePrint: TonePrint): string {
  // Create anonymous hash
  return base64(encrypt(tonePrint));
}

// Compare with others
function findMusicTwins(myTonePrint: TonePrint): MusicTwin[] {
  // Optional backend service
  // Or P2P sharing
}
```

---

#### **5.3 Voice Interface**
```bash
npm install @react-native-voice/voice
```

```typescript
// Voice commands
"Hey ToneMap, I need focus music"
"Play my Monday morning playlist"
"I'm feeling down, cheer me up"
"What should I listen to right now?"
"Show me my listening story"
```

---

#### **5.4 Spotify Integration Enhancements**
```typescript
// Export playlists to Spotify
async function exportToSpotify(playlist: Playlist): Promise<string> {
  // Create Spotify playlist
  const spotifyPlaylist = await createSpotifyPlaylist(playlist.name);

  // Add tracks
  await addTracksToPlaylist(spotifyPlaylist.id, playlist.tracks);

  // Set description
  await updatePlaylistDescription(
    spotifyPlaylist.id,
    `Generated by ToneMap based on your ${playlist.context} listening patterns 🎵`
  );

  return spotifyPlaylist.external_urls.spotify;
}

// Auto-sync feature
class PlaylistSyncer {
  // Keep Spotify playlists updated
  async syncPlaylists(): Promise<void> {
    // Update "Right Now" playlist every hour
    // Refresh context-based playlists daily
  }
}
```

---

### **PHASE 6: Data Visualization & Analytics** (Week 6-7)

#### **6.1 Advanced Charts**
```bash
npm install react-native-svg
npm install react-native-chart-kit
# Or victory-native for more control
```

**Chart Types:**
1. **Listening Clock** ⏰
   - 24-hour circular heatmap
   - Color-coded by energy/mood

2. **Genre Galaxy** 🌌
   - Bubble chart (size = listening time)
   - Clusters by genre similarity

3. **Mood Timeline** 📈
   - Line graph of avg valence over time
   - Annotations for life events

4. **Energy Heatmap** 🔥
   - Calendar view (like GitHub contributions)
   - Intensity = listening time + energy

5. **Vibe Radar** 🎯
   - Spider chart of 6 vibe categories
   - Compare week-over-week

6. **Context Breakdown** 📊
   - Stacked bar: % listening by context
   - Time of day, weather, activity

---

#### **6.2 Listening Dashboard**
```
┌─────────────────────────────────┐
│  THIS WEEK                      │
│  18.5 hours • 287 tracks        │
│                                  │
│  Top Vibe: Party 🎉 (38%)       │
│  Top Genre: Indie Rock 🎸       │
│  Avg Energy: 72% ⚡             │
│  Mood: Positive 😊 (+12%)       │
├─────────────────────────────────┤
│  [Energy Timeline Chart]        │
├─────────────────────────────────┤
│  INSIGHTS                       │
│  🎵 Discovered 5 new artists    │
│  ⬆️ Energy up 18% vs last week │
│  🌧️ Rainy days = jazz mood     │
│  📅 Tuesday is your hype day    │
└─────────────────────────────────┘
```

---

### **PHASE 7: Monetization Strategy** (Week 8+)

#### **Free Tier:**
- Basic TonePrint analysis (weekly)
- 3 auto-generated playlists
- Limited history (last 7 days)
- Standard story (8 scenes)

#### **Premium Tier ($3.99/mo or $39/year):**
- **Unlimited playlist generation**
- **Advanced patterns** (time, weather, activity)
- **Full history** (unlimited)
- **Enhanced stories** (dynamic, context-aware)
- **Mood tracking & predictions**
- **Export data as JSON**
- **Playlist auto-sync to Spotify**
- **Priority support**
- **Early access to new features**

#### **Future: Team Plans ($9.99/mo for 5 users)**
- Music Twin features
- Shared playlists
- Group listening insights
- "Your squad's vibe this month"

---

## 🛠️ **Technical Architecture**

### **Data Storage:**
```typescript
// Use Realm or WatermelonDB for local database
npm install realm
// Or
npm install @nozbe/watermelondb

// Schema
ListeningEvent (primary table)
├─ track metadata
├─ audio features
├─ context (time, weather, location, activity, mood)
└─ engagement (duration, skipped, repeated)

Pattern (learned patterns)
├─ context signature
├─ typical features
└─ confidence score

TonePrint (snapshots)
├─ timestamp
├─ computed metrics
└─ insights
```

### **Backend (Optional but Recommended):**
```typescript
// Serverless functions (Firebase/Supabase)
- Pattern training (heavy computation)
- Music Twin matching
- Analytics aggregation
- Push notifications
```

### **API Integrations:**
- **Spotify API**: Music data & recommendations
- **OpenWeatherMap**: Weather context
- **Geolocation**: Location context
- **Motion Sensors**: Activity detection

---

## 📅 **Revised Timeline (8-Week MVP)**

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1-2 | **Data Collection** | Enhanced storage, context detection, pattern learner |
| 2-3 | **Dynamic Stories** | Context-aware story generator, AI insights |
| 3-4 | **Smart Playlists** | Context-aware playlist engine, auto-generation |
| 4-5 | **Learning Loop** | Feedback collection, pattern refinement, anomaly detection |
| 5-6 | **Advanced Features** | Mood prediction, voice control, Spotify sync |
| 6-7 | **Visualization** | Advanced charts, dashboard, shareable cards |
| 7-8 | **Polish & Launch** | Onboarding, animations, beta testing |

---

## 🎯 **Priority Order (Do First):**

1. ✅ **Local database setup** (Realm) - Store listening events
2. ✅ **Context detector** - Time, weather, activity
3. ✅ **Pattern learner** - Detect listening patterns
4. ✅ **Smart playlist engine** - Generate context-aware playlists
5. ✅ **Dynamic story generator** - Evolving TonePrint stories
6. ✅ **Feedback loop** - Learn from user engagement
7. ✅ **Spotify playlist export** - One-click save to Spotify
8. ✅ **Weather integration** - Context-aware playlists
9. ✅ **Listening dashboard** - Weekly insights
10. ✅ **Shareable stories** - Viral growth

---

## 💡 **Unique Differentiators**

What makes ToneMap special:

1. **Context-Aware Intelligence** - No other app predicts what you want based on time/weather/activity
2. **Learning System** - Gets smarter the more you use it
3. **Story-First UX** - Beautiful, shareable narratives (not just charts)
4. **Mood Support** - Gentle mental health support through music
5. **No Social Network** - Privacy-first, just you and your music
6. **Predictive Playlists** - "Right Now" playlist that updates automatically