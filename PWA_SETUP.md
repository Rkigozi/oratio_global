# PWA Setup - Phase 1 Priority

## Progressive Web App Configuration for Mobile Installation

### **Why PWA for Oratio?**
- **Mobile-like experience** without app store submission
- **Offline capability** for basic functionality
- **Installable** on home screen
- **Push notifications** (future feature)
- **Better performance** with service worker caching

### **1. Web App Manifest (HIGH PRIORITY)**
**Problem**: No manifest file for PWA installation.

**Fix:**
```json
// public/manifest.json
{
  "name": "Oratio - Global Prayer Platform",
  "short_name": "Oratio",
  "description": "Connect through prayer. Share your burdens, pray for others, explore global prayer activity.",
  "theme_color": "#0A1A3A",
  "background_color": "#0A1A3A",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home-mobile.png",
      "sizes": "360x640",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/feed-mobile.png",
      "sizes": "360x640",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["lifestyle", "social"],
  "shortcuts": [
    {
      "name": "Submit Prayer",
      "short_name": "Submit",
      "description": "Share your prayer request",
      "url": "/submit",
      "icons": [{ "src": "/icons/submit-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Prayer Feed",
      "short_name": "Feed",
      "description": "Browse prayer requests",
      "url": "/feed",
      "icons": [{ "src": "/icons/feed-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

**Files to create:**
1. `public/manifest.json` - Web app manifest
2. `public/icons/` - Icon directory with multiple sizes
3. `index.html` - Update to include manifest link

**Index.html update:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />
    
    <!-- Theme Color -->
    <meta name="theme-color" content="#0A1A3A" />
    
    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
    
    <!-- Safari Pinned Tab -->
    <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0A1A3A" />
    
    <!-- MS Application -->
    <meta name="msapplication-TileColor" content="#0A1A3A" />
    <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
    
    <title>Oratio - Global Prayer Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Acceptance Criteria:**
- [ ] Manifest file created with proper configuration
- [ ] Icons in multiple sizes (72x72 to 512x512)
- [ ] Index.html updated with PWA meta tags
- [ ] App installable on Android/Chrome
- [ ] App installable on iOS/Safari

### **2. Service Worker (MEDIUM PRIORITY)**
**Problem**: No service worker for offline capability.

**Fix:**
```typescript
// public/service-worker.js
const CACHE_NAME = 'oratio-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

**Register service worker in main.tsx:**
```typescript
// src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}
```

**Acceptance Criteria:**
- [ ] Service worker implemented
- [ ] Basic offline capability (cached pages)
- [ ] Cache strategy defined
- [ ] Service worker registration working

### **3. App Shell Architecture (LOW PRIORITY)**
**Problem**: No app shell for instant loading.

**Fix:**
```typescript
// Create app shell component
// src/app/AppShell.tsx

const AppShell = () => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Oratio</h1>
        {/* Navigation, etc. */}
      </header>
      <main className="app-main">
        {/* Dynamic content loads here */}
      </main>
      <footer className="app-footer">
        {/* Bottom navigation */}
      </footer>
    </div>
  );
};

// Cache app shell in service worker
const urlsToCache = [
  '/',
  '/app-shell',  // App shell HTML
  // ... other assets
];
```

**Acceptance Criteria:**
- [ ] App shell component created
- [ ] App shell cached for instant loading
- [ ] Dynamic content loading strategy
- [ ] Smooth transitions between pages

### **4. Push Notifications (FUTURE)**
**Problem**: No push notification capability.

**Fix (future implementation):**
```typescript
// Request permission
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

// Subscribe to push
const subscribeToPush = async () => {
  const serviceWorker = await navigator.serviceWorker.ready;
  const subscription = await serviceWorker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
  });
  
  // Send subscription to your server
  return subscription;
};
```

**Acceptance Criteria:**
- [ ] Notification permission flow
- [ ] Push subscription logic
- [ ] Service worker push event handler
- [ ] Backend integration for sending pushes

### **5. PWA Testing & Validation**
**Tools to test PWA:**

**1. Lighthouse (Chrome DevTools)**
- Run Lighthouse audit
- Target: 90+ PWA score

**2. pwabuilder.com**
- Validate manifest and service worker
- Generate app store packages (optional)

**3. Manual testing:**
```bash
# Check manifest
curl http://localhost:5173/manifest.json

# Check service worker
chrome://serviceworker-internals/

# Test install prompt
# - Chrome: should show install button in address bar
# - Safari: should show "Add to Home Screen" in share menu
```

**Acceptance Criteria:**
- [ ] Lighthouse PWA score > 90
- [ ] Manifest validation passes
- [ ] Service worker working
- [ ] Installable on Android and iOS

## Implementation Order

### **Week 1:**
1. Create manifest.json with basic configuration
2. Generate app icons in multiple sizes
3. Update index.html with PWA meta tags

### **Week 2:**
1. Implement basic service worker
2. Cache essential assets (HTML, CSS, JS)
3. Test offline functionality

### **Week 3:**
1. Implement app shell architecture
2. Add more sophisticated caching strategies
3. Test on multiple devices/browsers

## PWA Features Checklist

### **Required for "Installable":**
- [ ] Web app manifest with icons
- [ ] Service worker registered
- [ ] Served over HTTPS (in production)
- [ ] Responsive design

### **Recommended for Better UX:**
- [ ] App shell architecture
- [ ] Offline functionality
- [ ] Push notifications
- [ ] Background sync
- [ ] Share target API

### **Future Enhancements:**
- [ ] Periodic background sync
- [ ] Web Share API integration
- [ ] Badging API for notifications
- [ ] Media session API for audio prayers

## Platform-Specific Considerations

### **iOS/Safari:**
- Requires apple-touch-icon meta tag
- Splash screen images (different sizes)
- Status bar styling
- "apple-mobile-web-app-capable" meta tag

### **Android/Chrome:**
- Maskable icons for adaptive icons
- Shortcuts for quick actions
- Splash screen with background color
- Theme color for address bar

### **Windows:**
- MS tile configuration
- Badge notifications
- Jump list integration

## Deployment Checklist

### **Before Deployment:**
1. Generate proper icon sizes (72x72 to 512x512)
2. Create maskable icons for Android
3. Create Apple touch icons for iOS
4. Test manifest with validator
5. Test service worker locally

### **After Deployment:**
1. Test with HTTPS (required for service worker)
2. Run Lighthouse audit on production
3. Test install on Android and iOS
4. Monitor service worker errors
5. Update cache version when deploying updates

## Resources & Tools

### **Icon Generation:**
- **Favicon.io**: Generate all icon sizes
- **RealFaviconGenerator**: Comprehensive icon generator
- **Android Studio**: Create adaptive icons

### **Testing Tools:**
- **Lighthouse**: Built into Chrome DevTools
- **PWABuilder**: Microsoft's PWA testing tool
- **WebPageTest**: Performance testing

### **Documentation:**
- **MDN Web Docs**: PWA guide
- **web.dev**: PWA learning path
- **Chrome DevTools**: PWA debugging

---

**Status**: Phase 1 Priority  
**Estimated Time**: 6-10 hours  
**Blockers**: Security and performance fixes first  
**Next**: After PWA setup, move to Phase 2 (Backend Integration)