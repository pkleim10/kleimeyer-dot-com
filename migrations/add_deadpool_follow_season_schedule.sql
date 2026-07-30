-- Dead Pool: July 1 auto-advance for the next recruiting season
--
-- When follow_season_schedule is true, getActiveSeasonYear() advances the
-- stored season_year up to the July-1 schedule (calendar year + 1 from July
-- onward). Manual admin changes turn the flag off so the commissioner can
-- keep the prior season selected for late scoring without being yanked
-- forward on the next page load.

ALTER TABLE deadpool_settings
  ADD COLUMN IF NOT EXISTS follow_season_schedule BOOLEAN NOT NULL DEFAULT true;
