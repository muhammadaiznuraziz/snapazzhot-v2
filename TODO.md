# Dashboard API Fix - TODO

## Step 1: Compute analytics locally from Supabase data

- [x] Remove `fetchDashboardData()` API calls
- [x] Compute `analytics` (photosCount, gifsCount, videosCount, totalPrints, totalEmails, totalEvents, visitorCount) from `photos[]` and `events[]`
- [x] Generate `chartData` grouped by day from photos

## Step 2: Replace Printer/Camera/Settings with local defaults

- [x] Initialize `printer` with default mock data
- [x] Initialize `camera` with default mock data
- [x] Initialize `settings` with default mock data
- [x] Make update handlers work locally (no API calls)

## Step 3: Generate Activity Logs locally

- [x] Generate `systemLogs` from photos and events timestamps

## Step 4: Remove all `/api/*` fetch calls

- [x] Remove `guardedFetch` function
- [x] Remove all `console.warn` messages about non-JSON responses
- [x] Clean up `initialDashboardLoadRef`

## Step 5: Test

- [x] Verify Dashboard loads without console warnings
