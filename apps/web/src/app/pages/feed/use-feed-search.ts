import { useEffect, useRef, useState } from 'react';
import { searchUsers } from '../../services/supabase-queries';
import { captureEvent } from '../../../lib/analytics';

function readRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem('oratio_recent_searches') || '[]') as string[];
  } catch {
    return [];
  }
}

export function useFeedSearch(initialQuery: string) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSearch, setActiveSearch] = useState(initialQuery);
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches());
  const [userResults, setUserResults] = useState<
    Array<{ username: string; display_name: string | null }>
  >([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const addRecentSearch = (q: string) => {
    if (!q.trim()) return;
    try {
      const existing = readRecentSearches();
      const filtered = existing.filter((s) => s !== q);
      filtered.unshift(q);
      const next = filtered.slice(0, 10);
      localStorage.setItem('oratio_recent_searches', JSON.stringify(next));
      setRecentSearches(next);
    } catch {
      /* ignore */
    }
  };

  const removeRecentSearch = (q: string) => {
    try {
      const existing = readRecentSearches();
      const next = existing.filter((s) => s !== q);
      localStorage.setItem('oratio_recent_searches', JSON.stringify(next));
      setRecentSearches(next);
    } catch {
      /* ignore */
    }
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    setActiveSearch(q);
    addRecentSearch(q);
    setShowRecent(false);
    if (q) captureEvent('search_performed', { query: q });
  };

  const handleRecentClick = (q: string) => {
    setSearchQuery(q);
    setActiveSearch(q);
    setShowRecent(false);
  };

  const handleTagClick = (tag: string) => {
    const q = tag.startsWith('#') ? tag : `#${tag}`;
    setSearchQuery(q);
    setActiveSearch(q);
    addRecentSearch(q);
  };

  // Close recent dropdown on outside click
  useEffect(() => {
    if (!showRecent) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showRecent]);

  // Search users from Supabase when query changes
  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      if (!activeSearch) {
        setUserResults([]);
        setSearchingUsers(false);
        return;
      }

      setSearchingUsers(true);
      const results = await searchUsers(activeSearch);
      if (!active) return;
      setUserResults(results);
      setSearchingUsers(false);
    };

    void loadUsers();

    return () => {
      active = false;
    };
  }, [activeSearch]);

  return {
    searchQuery,
    setSearchQuery,
    activeSearch,
    setActiveSearch,
    showRecent,
    setShowRecent,
    recentSearches,
    userResults,
    searchingUsers,
    searchRef,
    addRecentSearch,
    removeRecentSearch,
    handleSearchSubmit,
    handleRecentClick,
    handleTagClick,
  };
}
