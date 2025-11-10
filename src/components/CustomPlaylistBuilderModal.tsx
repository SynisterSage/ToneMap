import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Text,
  ActivityIndicator,
} from 'react-native';
import {H2, H3, Body, Small} from './Typography';
import {useTheme} from '../theme';
import ThemedButton from './ThemedButton';
import Icon from './Icon';
import Slider from '@react-native-community/slider';
import type {PlaylistFilters} from '../types/playlists';

interface CustomPlaylistBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (filters: PlaylistFilters, name: string, trackCount: number) => Promise<void>;
}

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Indie',
  'Jazz', 'Classical', 'Country', 'Latin', 'Alternative', 'Metal',
];

const TIME_OPTIONS = ['morning', 'afternoon', 'evening', 'night'];
const ACTIVITY_OPTIONS = ['working', 'exercising', 'relaxing', 'commuting', 'socializing'];

export default function CustomPlaylistBuilderModal({
  visible,
  onClose,
  onGenerate,
}: CustomPlaylistBuilderModalProps) {
  const {colors, spacing} = useTheme();
  
  // State
  const [playlistName, setPlaylistName] = useState('');
  const [trackCount, setTrackCount] = useState(25);
  const [energyRange, setEnergyRange] = useState<[number, number]>([0.3, 0.8]);
  const [valenceRange, setValenceRange] = useState<[number, number]>([0.3, 0.8]);
  const [tempoRange, setTempoRange] = useState<[number, number]>([80, 140]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setPlaylistName('');
      setTrackCount(25);
      setEnergyRange([0.3, 0.8]);
      setValenceRange([0.3, 0.8]);
      setTempoRange([80, 140]);
      setSelectedGenres([]);
      setSelectedTimes([]);
      setSelectedActivities([]);
    }
  }, [visible]);

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);

      const filters: PlaylistFilters = {
        energy_range: energyRange,
        valence_range: valenceRange,
        tempo_range: tempoRange,
      };

      if (selectedGenres.length > 0) {
        filters.genres = selectedGenres.map(g => g.toLowerCase());
      }

      if (selectedTimes.length > 0) {
        filters.time_of_day = selectedTimes as any;
      }

      if (selectedActivities.length > 0) {
        filters.activity_type = selectedActivities as any;
      }

      const name = playlistName.trim() || `Custom Mix - ${new Date().toLocaleDateString()}`;

      await onGenerate(filters, name, trackCount);
      onClose();
    } catch (error) {
      console.error('Failed to generate custom playlist:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="x" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <H2 style={{color: colors.primary, flex: 1, textAlign: 'center'}}>
            Custom Playlist Builder
          </H2>
          <View style={{width: 24}} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Playlist Name */}
          <View style={styles.section}>
            <H3 style={{color: colors.primary, marginBottom: spacing.small}}>
              Playlist Name
            </H3>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                borderColor: colors.border,
              }]}
              placeholder="My Custom Playlist"
              placeholderTextColor={colors.textSecondary}
              value={playlistName}
              onChangeText={setPlaylistName}
            />
          </View>

          {/* Track Count */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <H3 style={{color: colors.primary}}>Number of Tracks</H3>
              <Body style={{color: colors.accent, fontWeight: 'bold'}}>
                {trackCount}
              </Body>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={100}
              step={5}
              value={trackCount}
              onValueChange={setTrackCount}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.accent}
            />
            <View style={styles.sliderLabels}>
              <Small style={{color: colors.textSecondary}}>10</Small>
              <Small style={{color: colors.textSecondary}}>100</Small>
            </View>
          </View>

          {/* Energy Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <H3 style={{color: colors.primary}}>Energy Level</H3>
              <Body style={{color: colors.accent}}>
                {Math.round(energyRange[0] * 100)} - {Math.round(energyRange[1] * 100)}%
              </Body>
            </View>
            <View style={styles.rangeSlider}>
              <Text style={{color: colors.textSecondary, fontSize: 12}}>Low</Text>
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={energyRange[0]}
                onValueChange={(val: number) => setEnergyRange([val, Math.max(val + 0.1, energyRange[1])])}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={energyRange[1]}
                onValueChange={(val: number) => setEnergyRange([Math.min(val - 0.1, energyRange[0]), val])}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />
              <Text style={{color: colors.textSecondary, fontSize: 12}}>High</Text>
            </View>
          </View>

          {/* Mood (Valence) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <H3 style={{color: colors.primary}}>Mood</H3>
              <Body style={{color: colors.accent}}>
                {Math.round(valenceRange[0] * 100)} - {Math.round(valenceRange[1] * 100)}%
              </Body>
            </View>
            <View style={styles.rangeSlider}>
              <Text style={{color: colors.textSecondary, fontSize: 12}}>Sad</Text>
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={valenceRange[0]}
                onValueChange={(val: number) => setValenceRange([val, Math.max(val + 0.1, valenceRange[1])])}
                minimumTrackTintColor={colors.warning}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.warning}
              />
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={valenceRange[1]}
                onValueChange={(val: number) => setValenceRange([Math.min(val - 0.1, valenceRange[0]), val])}
                minimumTrackTintColor={colors.warning}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.warning}
              />
              <Text style={{color: colors.textSecondary, fontSize: 12}}>Happy</Text>
            </View>
          </View>

          {/* Tempo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <H3 style={{color: colors.primary}}>Tempo (BPM)</H3>
              <Body style={{color: colors.accent}}>
                {Math.round(tempoRange[0])} - {Math.round(tempoRange[1])}
              </Body>
            </View>
            <View style={styles.rangeSlider}>
              <Text style={{color: colors.textSecondary, fontSize: 12}}>Slow</Text>
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={60}
                maximumValue={200}
                step={5}
                value={tempoRange[0]}
                onValueChange={(val: number) => setTempoRange([val, Math.max(val + 10, tempoRange[1])])}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
              <Slider
                style={{flex: 1, marginHorizontal: spacing.medium}}
                minimumValue={60}
                maximumValue={200}
                step={5}
                value={tempoRange[1]}
                onValueChange={(val: number) => setTempoRange([Math.min(val - 10, tempoRange[0]), val])}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.accent}
              />
              <Text style={{color: colors.textSecondary, fontSize: 12}}>Fast</Text>
            </View>
          </View>

          {/* Genres */}
          <View style={styles.section}>
            <H3 style={{color: colors.primary, marginBottom: spacing.small}}>
              Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
            </H3>
            <Small style={{color: colors.textSecondary, marginBottom: spacing.small}}>
              Optional - leave empty for all genres
            </Small>
            <View style={styles.chipContainer}>
              {GENRE_OPTIONS.map(genre => (
                <TouchableOpacity
                  key={genre}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedGenres.includes(genre)
                        ? colors.primary + '30'
                        : colors.surface,
                      borderColor: selectedGenres.includes(genre)
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                  onPress={() => toggleGenre(genre)}
                >
                  <Small
                    style={{
                      color: selectedGenres.includes(genre)
                        ? colors.primary
                        : colors.textSecondary,
                    }}
                  >
                    {genre}
                  </Small>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time of Day */}
          <View style={styles.section}>
            <H3 style={{color: colors.primary, marginBottom: spacing.small}}>
              Time of Day {selectedTimes.length > 0 && `(${selectedTimes.length})`}
            </H3>
            <Small style={{color: colors.textSecondary, marginBottom: spacing.small}}>
              Optional - prefer tracks from these times
            </Small>
            <View style={styles.chipContainer}>
              {TIME_OPTIONS.map(time => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedTimes.includes(time)
                        ? colors.accent + '30'
                        : colors.surface,
                      borderColor: selectedTimes.includes(time)
                        ? colors.accent
                        : colors.border,
                    },
                  ]}
                  onPress={() => toggleTime(time)}
                >
                  <Small
                    style={{
                      color: selectedTimes.includes(time)
                        ? colors.accent
                        : colors.textSecondary,
                    }}
                  >
                    {time}
                  </Small>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Activities */}
          <View style={styles.section}>
            <H3 style={{color: colors.primary, marginBottom: spacing.small}}>
              Activities {selectedActivities.length > 0 && `(${selectedActivities.length})`}
            </H3>
            <Small style={{color: colors.textSecondary, marginBottom: spacing.small}}>
              Optional - prefer tracks for these activities
            </Small>
            <View style={styles.chipContainer}>
              {ACTIVITY_OPTIONS.map(activity => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedActivities.includes(activity)
                        ? colors.warning + '30'
                        : colors.surface,
                      borderColor: selectedActivities.includes(activity)
                        ? colors.warning
                        : colors.border,
                    },
                  ]}
                  onPress={() => toggleActivity(activity)}
                >
                  <Small
                    style={{
                      color: selectedActivities.includes(activity)
                        ? colors.warning
                        : colors.textSecondary,
                    }}
                  >
                    {activity}
                  </Small>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{height: 100}} />
        </ScrollView>

        {/* Generate Button */}
        <View style={[styles.footer, {backgroundColor: colors.background, borderTopColor: colors.border}]}>
          <ThemedButton
            title={generating ? 'Generating...' : 'Generate Playlist'}
            onPress={handleGenerate}
            disabled={generating}
            style={{flex: 1}}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  rangeSlider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
});
