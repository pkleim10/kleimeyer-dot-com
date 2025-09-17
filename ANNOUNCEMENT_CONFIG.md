# Announcement Summary Configuration

## Overview

The announcement summary on the family dashboard is now configurable through constants defined in `src/config/announcements.js`.

## Configuration Options

### `ANNOUNCEMENT_SUMMARY_LIMIT`
- **Default**: `4`
- **Purpose**: Maximum number of announcements to display in the family dashboard summary
- **Usage**: Controls the total number of items shown in the announcement summary

### `MIN_APPOINTMENTS_IN_SUMMARY`
- **Default**: `2`
- **Purpose**: Minimum number of appointments to prioritize in the summary
- **Usage**: Ensures that appointments are given priority in the selection algorithm

## How to Change the Values

1. Open `src/config/announcements.js`
2. Modify the values as needed:

```javascript
// Example: Show 6 announcements with at least 3 appointments
export const ANNOUNCEMENT_SUMMARY_LIMIT = 6
export const MIN_APPOINTMENTS_IN_SUMMARY = 3
```

## Selection Algorithm

The announcement summary uses a smart selection algorithm:

1. **Filter**: Only shows announcements from the last week
2. **Limit Check**: If total announcements ≤ `ANNOUNCEMENT_SUMMARY_LIMIT`, show all
3. **Priority Selection**: 
   - If ≥ `MIN_APPOINTMENTS_IN_SUMMARY` appointments exist, prioritize them
   - Fill remaining slots with closest non-appointments
   - Add more appointments if slots remain
4. **Fallback**: If < `MIN_APPOINTMENTS_IN_SUMMARY` appointments, select closest items overall

## Example Scenarios

### Scenario 1: Show 6 announcements, prioritize 3 appointments
```javascript
export const ANNOUNCEMENT_SUMMARY_LIMIT = 6
export const MIN_APPOINTMENTS_IN_SUMMARY = 3
```

### Scenario 2: Show 3 announcements, prioritize 1 appointment
```javascript
export const ANNOUNCEMENT_SUMMARY_LIMIT = 3
export const MIN_APPOINTMENTS_IN_SUMMARY = 1
```

### Scenario 3: Show 8 announcements, no appointment priority
```javascript
export const ANNOUNCEMENT_SUMMARY_LIMIT = 8
export const MIN_APPOINTMENTS_IN_SUMMARY = 0
```

## Files Modified

- `src/config/announcements.js` - New configuration file
- `src/app/family/page.jsx` - Updated to use constants instead of hardcoded values
