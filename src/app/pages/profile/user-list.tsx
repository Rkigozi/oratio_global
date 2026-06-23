import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { getInitialAvatarUrl } from '../../services/upload';
import { getProfileByUsername, getFollowers, getFollowing } from '../../services/supabase-queries';

interface UserEntry {
  id: string;
  username: string;
  display_name: string | null;
}

export function UserFollowing() {
  return <UserList type="following" />;
}

export function UserFollowers() {
  return <UserList type="followers" />;
}

function UserList({ type }: { type: "following" | "followers" }) {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const username = name ? decodeURIComponent(name) : "";
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    let active = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const profile = await getProfileByUsername(username);
        if (!profile) {
          if (active) setUsers([]);
          return;
        }

        const entries = type === "following"
          ? await getFollowing(profile.id)
          : await getFollowers(profile.id);
        if (active) setUsers(entries);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchUsers();

    return () => {
      active = false;
    };
  }, [username, type]);

  return (
    <div className="w-full min-h-dvh flex flex-col" style={{ background: "rgb(var(--rgb-bg))" }}>
      <div className="flex-shrink-0 pt-[max(1.5rem,env(safe-area-inset-top))] pb-2 px-4"
        style={{ background: "linear-gradient(to bottom, rgba(var(--rgb-bg), 0.98), rgba(var(--rgb-bg), 0))" }}
      >
        <div className="flex items-center gap-3 mt-12">
          <button onClick={() => void navigate(-1)}
            className="flex items-center gap-2 text-text-muted hover:text-text-muted transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="text-xs">Back</span>
          </button>
          <h2 className="text-text font-heading text-sm font-light capitalize">{type}</h2>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {loading ? (
            <p className="text-center text-text-dim text-xs py-12">Loading...</p>
          ) : users.length > 0 ? (
            <div className="space-y-1.5">
              {users.map((entry) => (
                <div key={entry.id}
                  onClick={() => void navigate(`/user/${encodeURIComponent(entry.username)}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-accent/4 transition-colors"
                >
                  <img src={getInitialAvatarUrl(entry.display_name || entry.username)} alt={entry.display_name || entry.username || "User"} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text text-sm font-medium truncate">{entry.display_name || entry.username}</p>
                    {entry.display_name && (
                      <p className="text-text-dim text-xs truncate">@{entry.username}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              {type === "following" ? (
                <>
                  <UserPlus size={24} className="text-text-dim mx-auto mb-3" />
                  <p className="text-text-muted text-sm mb-1">Not following anyone</p>
                  <p className="text-text-dim text-xs">Follow people from their prayer pages</p>
                </>
              ) : (
                <>
                  <Users size={24} className="text-text-dim mx-auto mb-3" />
                  <p className="text-text-muted text-sm mb-1">No followers yet</p>
                  <p className="text-text-dim text-xs">Growing your community takes time</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
