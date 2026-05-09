export function generateUsernameFromDisplayName(displayName: string): string {
  let username = displayName.toLowerCase();
  username = username.replace(/[^a-z0-9_.]/g, '_');
  username = username.replace(/[_]+/g, '_');
  username = username.replace(/[.]+/g, '.');
  username = username.replace(/^[_\.]+|[_\.]+$/g, '');
  return username.slice(0, 30);
}
