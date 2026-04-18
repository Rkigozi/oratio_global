import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { User, UserPlus, UserCheck, Search, X } from "lucide-react";
import { useNavigate } from "react-router";
import { getFollowingList } from "../data/profile-data";

export function FollowingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [following, setFollowing] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("oratio_following") || "[]") as string[];
      return new Set(saved);
    } catch {
      return new Set();
    }
  });

  const followingList = useMemo(() => 
    getFollowingList(searchQuery), 
    [searchQuery]
  );

  const toggleFollow = (name: string) => {
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      localStorage.setItem("oratio_following", JSON.stringify([...next]));
      return next;
    });
  };

  const clearSearch = () => setSearchQuery("");

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#0A1A3A" }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(124, 143, 255, 0.04), transparent 70%)",
        }}
      />

      <div className="relative z-10 px-5 pt-8 pb-24 overflow-y-auto flex-1 h-full">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-[#e2e4f0] font-heading text-lg mb-2">People You Follow</h2>
            <p className="text-[#6b7499] text-sm">
              {following.size} {following.size === 1 ? 'person' : 'people'} followed
            </p>
          </div>

          {/* Search bar */}
          <div className="mb-6 relative">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7499]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search following..."
                className="w-full rounded-xl pl-10 pr-10 py-3 text-[#e2e4f0] placeholder-[#5a6080] text-sm focus:outline-none border border-[rgba(124,143,255,0.15)] focus:border-[rgba(124,143,255,0.3)] transition-colors"
                style={{ background: "rgba(15, 20, 50, 0.6)" }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7499] hover:text-[#8890b5] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[#6b7499] text-xs mt-2">
                Found {followingList.length} {followingList.length === 1 ? 'match' : 'matches'}
              </p>
            )}
          </div>

          {/* Following list */}
          <div className="space-y-2.5">
            {followingList.length > 0 ? (
              followingList.map((person) => {
                const isFollowing = following.has(person.name);
                return (
                  <motion.div
                    key={person.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-[rgba(124,143,255,0.02)] transition-colors"
                    style={{
                      background: "linear-gradient(145deg, rgba(25, 32, 65, 0.6), rgba(15, 20, 50, 0.4))",
                      border: "1px solid rgba(124,143,255,0.08)",
                    }}
                    onClick={() => {
                      // TODO: Navigate to person's prayers feed
                      // For now, just toggle follow on click
                      toggleFollow(person.name);
                    }}
                  >
                    <span className="text-2xl">{person.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#c5cbe2] text-sm truncate">{person.name}</p>
                      <p className="text-[#5a6080] text-xs truncate">Click to unfollow</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFollow(person.name); }}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-all duration-200 cursor-pointer ${
                        isFollowing
                          ? "bg-[rgba(255,107,107,0.06)] text-[#ff6b6b] border border-[rgba(255,107,107,0.15)] hover:bg-[rgba(255,107,107,0.12)]"
                          : "bg-[rgba(124,143,255,0.06)] text-[#7c8fff] border border-[rgba(124,143,255,0.15)] hover:bg-[rgba(124,143,255,0.12)]"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck size={11} />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus size={11} />
                          Follow
                        </>
                      )}
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 rounded-xl"
                style={{
                  background: "rgba(17, 26, 58, 0.4)",
                  border: "1px solid rgba(124,143,255,0.05)",
                }}
              >
                {searchQuery ? (
                  <>
                    <Search size={24} className="text-[#4e5573] mx-auto mb-3" />
                    <p className="text-[#6b7499] text-sm mb-1">No matches found</p>
                    <p className="text-[#4e5573] text-xs">
                      Try a different search term
                    </p>
                    <button
                      onClick={clearSearch}
                      className="mt-4 px-5 py-2.5 rounded-full text-sm text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <User size={24} className="text-[#4e5573] mx-auto mb-3" />
                    <p className="text-[#6b7499] text-sm mb-1">Not following anyone yet</p>
                    <p className="text-[#4e5573] text-xs">
                      Follow people from the prayer feed to see their prayers here.
                    </p>
                    <button
                      onClick={() => navigate('/feed')}
                      className="mt-4 px-5 py-2.5 rounded-full text-sm text-[#7c8fff] bg-[rgba(124,143,255,0.08)] border border-[rgba(124,143,255,0.12)] cursor-pointer hover:bg-[rgba(124,143,255,0.12)] transition-all"
                    >
                      Browse Feed
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}