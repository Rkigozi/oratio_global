// Domain query modules live in packages/shared and are shared with the
// mobile app. Importing ./supabase first registers the web client with the
// shared holder before any query module evaluates.

import './supabase';

export * from '@oratio/shared/queries';
