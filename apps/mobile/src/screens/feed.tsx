import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Bookmark, ChevronDown, Plus, Search, UsersRound, X } from 'lucide-react-native';
import { useFeed } from '../hooks/use-feed';
import { PrayerCard } from '../components/prayer-card';
import { asNativeIcon } from '../components/icon';
import { BrandLockup } from '../components/brand-lockup';
import { ScreenHeaderTitle } from '../components/screen-header-title';
import { colors, fontFamilies } from '../theme';
import { useActivityUpdates } from '../hooks/activity-updates-context';
import type { RootStackParamList } from '../navigation';
import type { FeedAudienceMode } from '@oratio/shared/queries';
import { countries } from '@oratio/shared/prayer-data';
import { getHashtagCounts } from '@oratio/shared/hashtags';

type PrayerFeedProps = {
  audienceMode: FeedAudienceMode;
  title: string;
  subtitle: string;
  emptyText: string;
  manageCircle?: boolean;
  showUpdates?: boolean;
};

const BellIcon = asNativeIcon(Bell);
const BookmarkIcon = asNativeIcon(Bookmark);
const ChevronDownIcon = asNativeIcon(ChevronDown);
const PlusIcon = asNativeIcon(Plus);
const SearchIcon = asNativeIcon(Search);
const UsersIcon = asNativeIcon(UsersRound);
const XIcon = asNativeIcon(X);

type PublicFeedFilter = 'all' | 'saved' | 'country';

type FilterPillProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

function FilterPill({
  label,
  active,
  onPress,
  accessibilityLabel,
  leftIcon,
  rightIcon,
}: FilterPillProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filterPill, active && styles.filterPillActive]}
    >
      {leftIcon}
      <Text numberOfLines={1} style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
      {rightIcon}
    </Pressable>
  );
}

function CountryFilterSheet({
  visible,
  selectedCountry,
  onClose,
  onClear,
  onSelect,
}: {
  visible: boolean;
  selectedCountry?: string;
  onClose: () => void;
  onClear: () => void;
  onSelect: (country: string) => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close country filter"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalBackdrop}
        />
        <SafeAreaView edges={['bottom']} style={styles.countrySheetSafeArea}>
          <View style={styles.countrySheet}>
            <View style={styles.countryHeader}>
              <View>
                <Text style={styles.countryTitle}>Country</Text>
                <Text style={styles.countrySubtitle}>Filter public prayers by country</Text>
              </View>
              <Pressable
                accessibilityLabel="Close country filter"
                accessibilityRole="button"
                onPress={onClose}
                style={styles.countryCloseButton}
              >
                <XIcon color={colors.textMuted} size={19} strokeWidth={1.7} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClear}
              style={[styles.countryOption, !selectedCountry && styles.countryOptionActive]}
            >
              <Text
                style={[
                  styles.countryOptionText,
                  !selectedCountry && styles.countryOptionTextActive,
                ]}
              >
                All countries
              </Text>
            </Pressable>
            <FlatList
              data={countries}
              initialNumToRender={countries.length}
              keyExtractor={(country) => country}
              renderItem={({ item }) => {
                const active = item === selectedCountry;
                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onSelect(item)}
                    style={[styles.countryOption, active && styles.countryOptionActive]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.countryOptionText, active && styles.countryOptionTextActive]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
              style={styles.countryList}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function PrayerFeedScreen({
  audienceMode,
  title,
  subtitle,
  emptyText,
  manageCircle = false,
  showUpdates = false,
}: PrayerFeedProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { unreadCount } = useActivityUpdates();
  const filtersEnabled = audienceMode === 'public';
  const brandedHeader = title === 'ORATIO';
  const [filterMode, setFilterMode] = useState<PublicFeedFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const countryFilter = filtersEnabled && filterMode === 'country' ? selectedCountry : undefined;
  const savedOnly = filtersEnabled && filterMode === 'saved';
  const { prayers, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, load } =
    useFeed(audienceMode, { country: countryFilter, savedOnly, search: activeSearch });
  const trendingHashtags = useMemo(() => getHashtagCounts(prayers).slice(0, 8), [prayers]);
  const feedSummary = activeSearch
    ? `Search: ${activeSearch}`
    : savedOnly
      ? 'Saved'
      : countryFilter
        ? `Prayers in ${countryFilter}`
        : 'Latest';
  const resolvedEmptyText = activeSearch
    ? savedOnly
      ? `No saved prayers match "${activeSearch}".`
      : countryFilter
        ? `No prayers in ${countryFilter} match "${activeSearch}".`
        : `No public prayers match "${activeSearch}".`
    : savedOnly
      ? 'No saved prayers yet.'
      : countryFilter
        ? `No public prayers in ${countryFilter} yet.`
        : emptyText;

  useEffect(() => {
    const timeout = setTimeout(() => setActiveSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const clearFilters = () => {
    setFilterMode('all');
    setSelectedCountry(undefined);
    setCountryPickerOpen(false);
  };

  // Reload whenever the feed regains focus so prayers submitted elsewhere
  // (submit screen, another device) show up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={[styles.header, styles.balancedHeader]}>
        <View style={styles.headerSide} />
        <View style={styles.headerCenter}>
          {brandedHeader ? (
            <BrandLockup align="center" subtitle={subtitle} />
          ) : (
            <ScreenHeaderTitle subtitle={subtitle} title={title} />
          )}
        </View>
        <View style={[styles.headerActions, styles.balancedHeaderActions]}>
          <Pressable
            accessibilityLabel="Share a prayer"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Submit')}
            style={styles.menuButton}
          >
            <PlusIcon color={colors.accent} size={20} strokeWidth={1.8} />
          </Pressable>
          {showUpdates ? (
            <Pressable
              accessibilityLabel={
                unreadCount > 0 ? `Open updates, ${unreadCount} unread` : 'Open updates'
              }
              accessibilityRole="button"
              onPress={() => navigation.navigate('Updates')}
              style={styles.menuButton}
            >
              <BellIcon color={colors.textSecondary} size={19} strokeWidth={1.7} />
              {unreadCount > 0 ? (
                <View style={styles.updatesBadge}>
                  <Text style={styles.updatesBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {manageCircle ? (
            <Pressable
              accessibilityLabel="Manage Prayer Circle"
              accessibilityRole="button"
              onPress={() => navigation.navigate('PrayerCircleManagement')}
              style={styles.menuButton}
            >
              <UsersIcon color={colors.textSecondary} size={20} strokeWidth={1.7} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {filtersEnabled ? (
        <View style={styles.filtersShell}>
          <ScrollView
            contentContainerStyle={styles.filterScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <FilterPill
              accessibilityLabel="Show all public prayers"
              active={!savedOnly && !countryFilter}
              label="All"
              onPress={clearFilters}
            />
            <FilterPill
              accessibilityLabel="Show saved prayers"
              active={savedOnly}
              label="Saved"
              leftIcon={
                <BookmarkIcon
                  color={savedOnly ? colors.accent : colors.textMuted}
                  size={13}
                  strokeWidth={1.7}
                />
              }
              onPress={() => {
                setSelectedCountry(undefined);
                setFilterMode('saved');
              }}
            />
            <FilterPill
              accessibilityLabel="Choose prayer country"
              active={Boolean(countryFilter)}
              label={countryFilter || 'Country'}
              onPress={() => setCountryPickerOpen(true)}
              rightIcon={
                <ChevronDownIcon
                  color={countryFilter ? colors.accent : colors.textMuted}
                  size={13}
                  strokeWidth={1.7}
                />
              }
            />
          </ScrollView>
          <View style={styles.searchShell}>
            <SearchIcon color={colors.textDim} size={17} strokeWidth={1.7} />
            <TextInput
              accessibilityLabel="Search public prayers"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={80}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => setActiveSearch(searchQuery.trim())}
              placeholder="Search prayers"
              placeholderTextColor={colors.textDim}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable
                accessibilityLabel="Clear prayer search"
                accessibilityRole="button"
                onPress={() => {
                  setSearchQuery('');
                  setActiveSearch('');
                }}
                style={styles.searchClearButton}
              >
                <XIcon color={colors.textMuted} size={15} strokeWidth={1.7} />
              </Pressable>
            ) : null}
          </View>
          {!searchQuery.trim() && !savedOnly && trendingHashtags.length > 0 ? (
            <View style={styles.trendingShell}>
              <Text style={styles.trendingLabel}>Trending</Text>
              <ScrollView
                contentContainerStyle={styles.trendingScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {trendingHashtags.map(({ tag, count }) => {
                  const searchValue = tag.replace(/^#/, '');
                  return (
                    <Pressable
                      accessibilityLabel={`Search prayers tagged ${searchValue}`}
                      accessibilityRole="button"
                      key={tag}
                      onPress={() => {
                        setSearchQuery(searchValue);
                        setActiveSearch(searchValue);
                      }}
                      style={styles.trendingPill}
                    >
                      <Text style={styles.trendingTag}>{tag}</Text>
                      <Text style={styles.trendingCount}>{count}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <View style={styles.feedSummary}>
            <Text numberOfLines={1} style={styles.feedSummaryLabel}>
              {feedSummary}
            </Text>
            <Text style={styles.feedSummaryCount}>
              {prayers.length} {prayers.length === 1 ? 'prayer' : 'prayers'}
            </Text>
          </View>
        </View>
      ) : null}

      {filtersEnabled ? (
        <CountryFilterSheet
          onClear={clearFilters}
          onClose={() => setCountryPickerOpen(false)}
          onSelect={(country) => {
            setSelectedCountry(country);
            setFilterMode('country');
            setCountryPickerOpen(false);
          }}
          selectedCountry={countryFilter}
          visible={countryPickerOpen}
        />
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.dim}>Loading prayers…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
          <Pressable onPress={() => void refresh()} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PrayerCard
              prayer={item}
              onPress={() => navigation.navigate('PrayerDetail', { prayerId: item.id })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.dim}>{resolvedEmptyText}</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <Text style={styles.footer}>Loading more…</Text> : hasMore ? null : null
          }
        />
      )}
    </SafeAreaView>
  );
}

export function FeedScreen() {
  return (
    <PrayerFeedScreen
      audienceMode="public"
      title="ORATIO"
      subtitle="Public prayers"
      emptyText="No public prayers yet."
      showUpdates
    />
  );
}

export function CircleScreen() {
  return (
    <PrayerFeedScreen
      audienceMode="circle"
      title="Prayer Circle"
      subtitle="Shared with your circle"
      emptyText="No prayers have been shared with your circle yet."
      manageCircle
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 70,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  balancedHeader: {
    paddingHorizontal: 12,
  },
  headerSide: {
    width: 96,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  balancedHeaderActions: {
    width: 96,
    justifyContent: 'flex-end',
  },
  filtersShell: {
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    minHeight: 38,
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.accentTintSoft,
  },
  filterPillActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentTint,
  },
  filterText: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
  },
  filterTextActive: {
    color: colors.accent,
  },
  feedSummary: {
    marginTop: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  searchShell: {
    minHeight: 48,
    marginTop: 10,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  searchClearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingShell: {
    marginTop: 10,
  },
  trendingLabel: {
    marginBottom: 6,
    paddingHorizontal: 20,
    color: colors.textDim,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  trendingScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  trendingPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.accentTintSoft,
  },
  trendingTag: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
  },
  trendingCount: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 10,
  },
  feedSummaryLabel: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  feedSummaryCount: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 10,
  },
  menuButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatesBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  updatesBadgeText: {
    color: colors.bg,
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 8,
    lineHeight: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  dim: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 13,
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  retryText: {
    color: colors.accent,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
  },
  footer: {
    color: colors.textDim,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  countrySheetSafeArea: {
    justifyContent: 'flex-end',
  },
  countrySheet: {
    maxHeight: 560,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  countryTitle: {
    color: colors.text,
    fontFamily: fontFamilies.headingMedium,
    fontSize: 18,
  },
  countrySubtitle: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 11,
    marginTop: 3,
  },
  countryCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryList: {
    maxHeight: 410,
  },
  countryOption: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  countryOptionActive: {
    backgroundColor: colors.accentTint,
  },
  countryOptionText: {
    color: colors.textSecondary,
    fontFamily: fontFamilies.body,
    fontSize: 14,
  },
  countryOptionTextActive: {
    color: colors.accent,
    fontFamily: fontFamilies.bodySemiBold,
  },
});
