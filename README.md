tracklog
========

A web-based editor for Garmin TCX tracklogs

See http://developer.garmin.com/schemas/tcx/v2 for the XML schema definition.

Behaviour

- It seems that both the app and the website ignore the distinction
  between multiple tracks within a lap
- It seems that all tracks have at least one trackpoint, but this may
  not have position data (see below).
- Tracks are only written when the GPS has a fix. If the GPS looses
  its fix, the track is terminated and a new one is started when it
  regains a fix. This means that a lap may contain zero tracks. Also,
  the sum of the time ranges of the tracks in a lap may not match the
  lap time.
- Pressing stop then start causes a new track to be started. It seems
  that the old track may be finished and the new track started with
  time-only trackpoints, presumbaly to record a precise timestamp even
  when no position is available.
  Pressing lap while started causes a new lap to be started. The above
  is true about time-only trackpoints in the final and starting tracks.
- Pressing lap while stopped causes a new lap to be started. It seems
  the previous lap is always terminated with a time-only track in this
  case, with only a single time-only trackpoint. Not sure why this is.
  The time-only track is 1s before the start of the new lap.
- Turning off then on while started causes a new track to be started
  (TODO: And lap?).
- Turning off then on while stopped also causes a new track to be
  started (TODO: And lap?).
- Turning off then on while stopped and after pressing lap causes a new
  lap to be started. The time-only track mentioned above seems to be
  written as part of the new lap in this case.
- There seems to be a condition where the lap distance doesn't match
  the sum of the track distances. Presumably this is because it
  attempts to estimate distance for segments where there's no GPS fix
  and hence no track. 
- There seems to be a condition where, when starting a new lap (perhaps
  when also turning off then on?), the previous lap is terminated with
  a time-only track, but with two trackpoints, rather then 1. The
  second of these is 1s before the new lap as normal, but the first is
  1s after the previous track. This messes up the total time for the
  lap. It can be fixed by deleting the track.

Conclusions

- A trackpoint can be time-only.
- A track must have trackpoints, but can be time-only.
- A track can have at most one time-only trackpoint at each end. So a
  track can have at most two time-only trackpoints and a time-only track can
  have at most two (time-only) trackpoints.
- A lap may have zero tracks, so can be time-only.
- A lap can have at most one time-only track at each end.
- Lap times and distances don't always match data from tracks.
- An activity may have zero laps.

Plan

- No need to offer collapsing of tracks, as viewer ignores them anyway.
- We should preserve the above facts about time-only tracks, so when
  merging laps, we should remove time-only tracks at the merge point.
- We shouldn't attempt to fix lap times or distances to match tracks.
  When removing or adding tracks, we should just shift the lap time or
  distance appropriately.

TODOs

- Refactor to use MVC
- Show tracks on map
- Allow manual override of displacement for merging laps/activities - does this make sense?
- Recalc maximum speed

