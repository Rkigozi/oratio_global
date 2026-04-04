# Performance Checklist - Phase 1 Priority

## Critical Performance Issues That Must Be Fixed Before Production

### **1. Pagination (HIGH PRIORITY)**
**Problem**: Loading all prayers at once (100+ items) causes slow rendering and high memory usage.

**Files to fix:**
- `src/app/pages/feed.tsx` - Prayer feed page
- `src/app/pages/home.tsx` - Home page prayer list
- Anywhere large lists are rendered

**Fix Options:**

**Option A: Infinite Scroll (Recommended)**
```typescript
// Install react-infinite-scroll-component
// npm install react-infinite-scroll-component

// Basic implementation:
import InfiniteScroll from 'react-infinite-scroll-component';

const PrayerFeed = () => {
  const [prayers, setPrayers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMorePrayers = async () => {
    // Load next page of prayers
    const nextPage = await fetchPrayers(page, 20);
    setPrayers([...prayers, ...nextPage]);
    setPage(page + 1);
    setHasMore(nextPage.length === 20);
  };

  return (
    <InfiniteScroll
      dataLength={prayers.length}
      next={loadMorePrayers}
      hasMore={hasMore}
      loader={<PrayerSkeleton />}
    >
      {prayers.map(prayer => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}
    </InfiniteScroll>
  );
};
```

**Option B: Load More Button (Simpler)**
```typescript
const PrayerFeed = () => {
  const [prayers, setPrayers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    const nextPage = await fetchPrayers(page, 20);
    setPrayers([...prayers, ...nextPage]);
    setPage(page + 1);
    setHasMore(nextPage.length === 20);
  };

  return (
    <>
      {prayers.map(prayer => (
        <PrayerCard key={prayer.id} prayer={prayer} />
      ))}
      {hasMore && (
        <Button onClick={loadMore}>
          Load More Prayers
        </Button>
      )}
    </>
  );
};
```

**Acceptance Criteria:**
- [ ] No more than 20-30 prayers loaded initially
- [ ] Smooth loading of additional prayers
- [ ] Loading states shown during fetch
- [ ] Memory usage reduced by 70%+

### **2. Bundle Optimization (HIGH PRIORITY)**
**Problem**: 69 dependencies, many unused. Large bundle size.

**Fix:**
```bash
# 1. Analyze bundle
npx vite-bundle-analyzer

# 2. Remove unused packages (40+ identified)
npm uninstall @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-badge @radix-ui/react-breadcrumb @radix-ui/react-calendar @radix-ui/react-carousel @radix-ui/react-chart @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-command @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-drawer @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-pagination @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-resizable @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-sidebar @radix-ui/react-skeleton @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-table @radix-ui/react-tabs @radix-ui/react-textarea @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip

# 3. Implement code splitting
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          map: ['leaflet', 'react-leaflet'],
        }
      }
    }
  }
});
```

**Acceptance Criteria:**
- [ ] Bundle size reduced from current ~2MB to <500KB gzipped
- [ ] First load under 100KB
- [ ] Code splitting implemented
- [ ] Tree shaking working correctly

### **3. Map Optimization (MEDIUM PRIORITY)**
**Problem**: Map renders 100+ markers at once.

**Fix:**
```typescript
// 1. Implement marker clustering
// npm install react-leaflet-cluster
import MarkerClusterGroup from 'react-leaflet-cluster';

<MarkerClusterGroup>
  {prayers.map(prayer => (
    <Marker key={prayer.id} position={[prayer.approxLat, prayer.approxLng]}>
      <Popup>{prayer.city}, {prayer.country}</Popup>
    </Marker>
  ))}
</MarkerClusterGroup>

// 2. Implement viewport-based rendering
// Only render markers in current viewport
const [visibleMarkers, setVisibleMarkers] = useState([]);

const handleViewportChanged = (viewport) => {
  const visible = prayers.filter(prayer => 
    isInViewport(prayer, viewport)
  );
  setVisibleMarkers(visible);
};
```

**Acceptance Criteria:**
- [ ] Marker clustering implemented
- [ ] Max 50 markers rendered at once
- [ ] Smooth pan/zoom performance
- [ ] Memory usage for map reduced

### **4. Image Optimization (MEDIUM PRIORITY)**
**Problem**: User icons/profile images not optimized.

**Fix:**
```typescript
// 1. Use next-gen formats (WebP)
// Convert all user icons to WebP format

// 2. Implement lazy loading
<img 
  src={userIcon} 
  loading="lazy"
  alt={`User ${userId}`}
/>

// 3. Implement responsive images
<picture>
  <source srcSet={`${icon}.webp`} type="image/webp" />
  <source srcSet={`${icon}.png`} type="image/png" />
  <img src={`${icon}.png`} alt="User icon" />
</picture>
```

**Acceptance Criteria:**
- [ ] All images in WebP format
- [ ] Lazy loading implemented
- [ ] Responsive images for different screen sizes
- [ ] Image CDN configured (for production)

### **5. State Management Optimization (LOW PRIORITY)**
**Problem**: Fragmented state management causing re-renders.

**Fix:**
```typescript
// Implement Zustand for global state
// npm install zustand

// src/stores/prayer-store.ts
import { create } from 'zustand';

interface PrayerStore {
  prayers: Prayer[];
  filteredPrayers: Prayer[];
  addPrayer: (prayer: Prayer) => void;
  updatePrayer: (id: string, updates: Partial<Prayer>) => void;
  filterByCategory: (category: string) => void;
}

export const usePrayerStore = create<PrayerStore>((set) => ({
  prayers: [],
  filteredPrayers: [],
  addPrayer: (prayer) => 
    set((state) => ({ prayers: [...state.prayers, prayer] })),
  updatePrayer: (id, updates) =>
    set((state) => ({
      prayers: state.prayers.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    })),
  filterByCategory: (category) =>
    set((state) => ({
      filteredPrayers: state.prayers.filter(p => p.category === category)
    }))
}));
```

**Acceptance Criteria:**
- [ ] Global state management implemented
- [ ] Reduced component re-renders
- [ ] Optimized state updates
- [ ] Memoization where needed

## Performance Metrics Targets

### **Core Web Vitals:**
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds
- **CLS (Cumulative Layout Shift)**: < 0.1

### **Bundle Size:**
- **Initial Load**: < 100KB gzipped
- **Total Bundle**: < 500KB gzipped
- **JavaScript**: < 300KB

### **Render Performance:**
- **Prayer Feed**: < 100ms to render 20 items
- **Map**: < 200ms to render with 50 markers
- **Navigation**: < 50ms between pages

## Implementation Order

### **Week 1:**
1. Implement pagination for prayer feed
2. Remove 20+ unused dependencies
3. Basic code splitting setup

### **Week 2:**
1. Map marker clustering
2. Image optimization (WebP, lazy loading)
3. Bundle analysis and optimization

### **Week 3:**
1. State management optimization
2. Performance monitoring setup
3. Final optimization pass

## Performance Testing

### **Manual Tests:**
1. Load prayer feed - should show 20 items initially
2. Scroll to load more - should load smoothly
3. Navigate between pages - should be instant
4. Zoom/pan map - should be smooth

### **Automated Tests:**
```typescript
// Performance test examples
describe('Performance', () => {
  test('pagination loads correct number of items', () => {
    render(<PrayerFeed />);
    const prayerCards = screen.getAllByTestId('prayer-card');
    expect(prayerCards.length).toBeLessThanOrEqual(20);
  });

  test('bundle size within limits', async () => {
    const stats = await getBundleStats();
    expect(stats.totalSize).toBeLessThan(500 * 1024); // 500KB
  });
});
```

## Monitoring & Measurement

### **Add performance monitoring:**
```typescript
// src/lib/performance-monitor.ts
export const measurePerformance = (metric: string, value: number) => {
  console.log(`[PERF] ${metric}: ${value}ms`);
  // Send to analytics in production
};

// Usage in components:
useEffect(() => {
  const start = performance.now();
  // Component logic
  const end = performance.now();
  measurePerformance('feed_render', end - start);
}, []);
```

## Tools & Resources

### **Development Tools:**
- **Vite Bundle Analyzer**: `npx vite-bundle-analyzer`
- **Lighthouse**: Chrome DevTools
- **React DevTools**: Profiler component
- **Webpack Bundle Analyzer** (if using Webpack)

### **Production Tools:**
- **Sentry Performance**: Error and performance tracking
- **Google Analytics**: User timing metrics
- **New Relic**: Application performance monitoring
- **Custom metrics dashboard**

---

**Status**: Phase 1 Priority  
**Estimated Time**: 10-15 hours  
**Blockers**: Security fixes first  
**Next**: After performance, move to PWA Setup