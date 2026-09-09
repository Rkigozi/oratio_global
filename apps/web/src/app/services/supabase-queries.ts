// Domain query modules for the Supabase backend. Each module owns the reads
// and writes for one domain (prayers, comments, reports, ...). New queries
// belong in the matching module — this file only re-exports the public API.

export * from './queries/prayers';
export * from './queries/interactions';
export * from './queries/comments';
export * from './queries/circle';
export * from './queries/updates';
export * from './queries/reports';
export * from './queries/profiles';
export * from './queries/saved';
export * from './queries/account';
export * from './queries/shared';
