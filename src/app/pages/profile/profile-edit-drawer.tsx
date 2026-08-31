import { Drawer } from 'vaul';
import { Camera } from 'lucide-react';
import { AvatarImage } from '../../components/avatar-image';

type DetectedLocation = { city: string; country: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarSource?: string;
  displayName: string;
  username: string;
  uploadingPhoto: boolean;
  photoUploadStatus: string;
  newUsername: string;
  newDisplayName: string;
  newBio: string;
  newLocation: string;
  useAutoLocation: boolean;
  geoLocation: DetectedLocation | null;
  geoLoading: boolean;
  geoDenied: boolean;
  editError: string;
  savingProfile: boolean;
  detectingAutoLocation: boolean;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onAutoLocationToggle: () => void;
  onSave: () => void;
  onRequestLocation: () => void;
};

export function ProfileEditDrawer({
  open,
  onOpenChange,
  avatarSource,
  displayName,
  username,
  uploadingPhoto,
  photoUploadStatus,
  newUsername,
  newDisplayName,
  newBio,
  newLocation,
  useAutoLocation,
  geoLocation,
  geoLoading,
  geoDenied,
  editError,
  savingProfile,
  detectingAutoLocation,
  onPhotoUpload,
  onUsernameChange,
  onDisplayNameChange,
  onBioChange,
  onLocationChange,
  onAutoLocationToggle,
  onSave,
  onRequestLocation,
}: Props) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[600]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[600] bg-bg rounded-t-2xl p-6 outline-none"
          style={{
            borderTop: '1px solid rgba(var(--rgb-accent), 0.1)',
            boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="mx-auto w-12 h-1.5 bg-accent/20 rounded-full mb-6" />
          <Drawer.Title className="sr-only">Edit Profile</Drawer.Title>
          <Drawer.Description className="sr-only">
            Update your username and display name
          </Drawer.Description>

          <div className="max-w-md mx-auto">
            <h3 className="text-text text-center mb-4 font-heading text-lg">Edit Profile</h3>

            {/* Photo upload */}
            <div className="flex justify-center mb-6">
              <label
                className={`flex flex-col items-center gap-2 ${uploadingPhoto ? 'cursor-wait' : 'cursor-pointer'}`}
              >
                <div className="relative">
                  <AvatarImage
                    src={avatarSource}
                    name={displayName || username}
                    alt={username || 'User'}
                    className="h-16 w-16 text-xl"
                  />
                  <div
                    className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <Camera size={16} className="text-white" />
                  </div>
                </div>
                <span className="text-accent text-xs" aria-live="polite">
                  {uploadingPhoto ? photoUploadStatus || 'Uploading photo...' : 'Change Photo'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={(e) => void onPhotoUpload(e)}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>

            <div className="mb-4">
              <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">
                Username
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => onUsernameChange(e.target.value.toLowerCase())}
                  onKeyDown={(e) => e.key === 'Enter' && void onSave()}
                  placeholder="your_username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`w-full rounded-xl py-3.5 pl-8 pr-4 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-danger' : 'border-accent/12'}`}
                  style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                />
              </div>
              <p className="text-text-dim text-[10px] mt-1 text-center">
                Lowercase letters, numbers, underscores, and dots.
              </p>
              <p className="text-text-dim text-[10px] mt-1 text-center leading-relaxed">
                Your prayers and Prayer Circle stay connected. Old profile links will still work.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">
                Display Name
              </p>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void onSave()}
                placeholder="Leave empty to use username"
                className={`w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border transition-colors text-center ${editError ? 'border-danger' : 'border-accent/12'}`}
                style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
              />
            </div>

            <div className="mb-4">
              <p className="text-text-muted text-xs uppercase tracking-[0.15em] mb-2 text-center">
                Bio
              </p>
              <textarea
                value={newBio}
                onChange={(e) => onBioChange(e.target.value)}
                placeholder="Tell people a bit about yourself..."
                rows={2}
                maxLength={150}
                className="w-full rounded-xl px-4 py-3 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 resize-none text-center"
                style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
              />
              <p className="text-text-dim text-[10px] text-right mt-1">{newBio.length}/150</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-text-muted text-xs uppercase tracking-[0.15em]">Location</p>
                <button
                  type="button"
                  onClick={onAutoLocationToggle}
                  className="relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
                  style={{
                    background: useAutoLocation
                      ? 'rgba(var(--rgb-accent), 0.35)'
                      : 'rgba(var(--rgb-accent), 0.12)',
                  }}
                  aria-label="Auto-detect location"
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-md"
                    style={{
                      transform: useAutoLocation ? 'translateX(18px)' : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>
              <p className="text-text-dim text-[10px] text-center mb-2">
                Toggle to auto-detect from your browser
              </p>
              {useAutoLocation ? (
                geoLocation ? (
                  <div
                    className="rounded-xl px-4 py-3 flex items-center gap-2 border border-accent/12 justify-center"
                    style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                  >
                    <span className="text-text text-sm">
                      {geoLocation.city}, {geoLocation.country}
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-text-dim text-xs">
                      {geoLoading
                        ? 'Detecting...'
                        : geoDenied
                          ? 'Location access denied'
                          : 'Location not available'}
                    </p>
                    {!geoLoading && !geoDenied && (
                      <button
                        onClick={onRequestLocation}
                        className="text-accent text-xs mt-1 cursor-pointer"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )
              ) : (
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => onLocationChange(e.target.value)}
                  placeholder="e.g. London, UK"
                  className="w-full rounded-xl px-4 py-3.5 text-text placeholder-text-dim text-sm focus:outline-none border border-accent/12 transition-colors text-center"
                  style={{ background: 'rgba(var(--rgb-surface), 0.6)' }}
                />
              )}
            </div>

            {editError && <p className="text-danger text-xs text-center mb-3">{editError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3.5 rounded-full text-sm text-text-muted bg-accent/6 border border-accent/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => void onSave()}
                disabled={savingProfile || detectingAutoLocation || uploadingPhoto}
                className="flex-1 py-3.5 rounded-full text-sm font-semibold cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{
                  background:
                    'linear-gradient(135deg, rgb(var(--rgb-accent)), rgb(var(--rgb-accent-dark)))',
                  color: '#fff',
                  boxShadow: '0 10px 24px rgba(var(--rgb-accent), 0.24)',
                }}
              >
                {uploadingPhoto
                  ? 'Uploading photo...'
                  : savingProfile
                    ? 'Saving...'
                    : detectingAutoLocation
                      ? 'Detecting...'
                      : 'Save Changes'}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
