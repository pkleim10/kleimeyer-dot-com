-- Dead Pool: track when each participant last viewed the Announcements feed.
--
-- Used to show a "Latest Announcements →" callout on the home page only when
-- something new has been posted since that visit. Guests always see the link;
-- signed-in players only see it when there is unread activity.

ALTER TABLE deadpool_participants
  ADD COLUMN IF NOT EXISTS announcements_seen_at TIMESTAMP WITH TIME ZONE;
