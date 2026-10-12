# Lead Strategus Tracker: domain port (bundle lines 19940-23300)

Maps every minified top-level identifier in the prototype bundle region
19781-23303 (plus the few just before 19940 that this region depends on) to its
new name. Import paths are relative to `src/internal/`.

Files:

- `lib/constants.js`: static reference data (people, task types, roles, default theme)
- `lib/dates.js`: date keys, week / month / period helpers, clock helpers
- `lib/domain.js`: pure logic (permissions, standards, difficulty, reports, metrics, spotlight, validators)
- `lib/seed.js`: demo-data generators and `buildInitialState()`
- `store.js`: persisted zustand store `useStore` (named + default export)

Conventions: a "date key" is `YYYY-MM-DD` (local); a week is keyed by its Monday;
a month by `YYYY-MM`; daily entries live at `state.daily["personId|dateKey"]`,
weekly entries at `state.weekly["personId|mondayKey"]`.

## Store

| Minified | New name | File | Description / signature |
|---|---|---|---|
| `Se` | `useStore` (also default export) | store.js | Persisted zustand hook. `useStore(selector)`, `useStore.getState()`, `.setState`, `.persist.rehydrate()`. localStorage key `"ls-tracker-v2"`, version 10 |
| (literal) | `STORAGE_KEY`, `STORAGE_VERSION` | store.js | `"ls-tracker-v2"`, `10` |
| `nt` | `displayName` | store.js | `(personId?) => string` profile name, else directory name, else `"Someone"` (reads the store) |
| `be` | `firstName` | store.js | `(personId?) => string` first word of `displayName` |
| (persist `merge` option) | `mergePersistedState` | store.js | `(persisted, current) => state`, rejects stale shapes, rolls week / month counters via `rollProjectPeriods` |
| `lR` | `create` from `zustand` | npm | `create()(persist(...))` |
| `$V`, `hb`, `IV`, `DV` | `createJSONStorage`, `persist` from `zustand/middleware` | npm | the bundled copy of the persist middleware; same behaviour. `migrate: () => buildInitialState()` |
| the `window` "storage" listener after the store | (bottom of store.js) | store.js | re-hydrates on `ls-tracker-v2` changes and keeps `me` |

State shape (from `buildInitialState`): `me, profiles, tasks, projects, notices, convs, msgs, aliases, daily, weekly`.

Store actions (identical names to the bundle; all in `useStore.getState()`):
`setMe(id)`, `startTask(id)`, `undoStart(id)`, `submitForReview(id, doneQty, minutes, reviewerId)`,
`approve(id)`, `sendBack(id, text)`, `assign(draft)`, `assignMany(drafts)`, `setProfile(personId, patch)`,
`editTask(id, {qty, targetMinutes, title})`, `remind(id)`, `setTarget(projectId, "weekTarget"|"monthTarget", key, value)`,
`setLock(projectId, "week"|"month", locked)`, `bump(projectId, key, delta)`, `forwardReview(id, toId, note?)`,
`saveWeekly(personId, week, patch)`, `updateProject(projectId, patch)`, `setWeekValue(projectId, key, value)`,
`setWeekValues(projectId, values)`, `saveDaily(personId, day, patch)`, `finalizeDay(projectId?, day?)`,
`setMetricPeriods(projectId, metricId, periods)`, `addMetric(projectId, label, periods?)`,
`removeMetric(projectId, metricId)`, `renameMetric(projectId, metricId, label)`,
`addMeeting(projectId, {company, contact, date, time})`, `postUpdate(projectId, text)`,
`proposeProject(draft) => id`, `decideProject(projectId, approved)`, `setProjectAdmins(projectId, ids)`,
`addProjectAdmin(projectId, personId)`, `removeProjectAdmin(projectId, personId)`,
`transferProject(projectId, newOwnerId, "remove-me"|"stay-admin"|other)`,
`setWeekPlan(projectId, week, key, value)`, `saveWeekPlan(projectId, week, counts)`, `clearWeekPlan(projectId, week)`,
`addCustomStandard(projectId, {name, unit, minutes}) => id`, `removeCustomStandard(projectId, standardId)`,
`readAll()`, `readNotice(id)`, `createConv(name, memberIds, group) => id`, `send(convId, text)`, `reset()`.
Actions throw `Error` with the original user-facing messages on validation failure.

## dates.js

| Minified | New name | Description / signature |
|---|---|---|
| `$w` | `MONTH_SHORT` | `["Jan",...,"Dec"]` |
| `YV` | `WEEKDAY_SHORT` | `["Sun",...,"Sat"]` (index = `Date#getDay`) |
| `XV` | `MONTH_LONG` | `["January",...]` |
| `KV` | `GRANULARITY_LABELS` | `{day:"Daily", week:"Weekly", month:"Monthly"}` |
| `ri` | `LUNCH_BLOCK` | `{start:"13:00", end:"14:00"}` lunch break, work blocks may not overlap |
| `dR`, `Iw` | `toDateKey` | `(Date) => "YYYY-MM-DD"` |
| `Xa` | `parseDateKey` | `(key) => Date` (local midnight) |
| `$e` | `todayKey` | `(offsetDays = 0) => key` |
| `ft` | `addDays` | `(key, days) => key` |
| `Wr` | `isWeekday` | `(key) => boolean` |
| `ia` | `previousWeekday` | `(key = today) => key` strictly before |
| `gV` | `nextWeekday` | `(key = today) => key` strictly after |
| `Xt` | `weekStart` | `(key) => mondayKey` |
| `Mt` | `currentWeekStart` | `(weeksOffset = 0) => mondayKey` |
| `yt` | `formatDayMonth` | `(key) => "5 Mar"` |
| `fR` | `lastWeekdays` | `(count, from = today) => key[]` nearest first |
| `$g` | `weekdaysBetween` | `(from, to) => key[]` |
| `yV` | `minutesToClock` | `(minutes) => "HH:MM"` |
| `Mn` | `clockToMinutes` | `("HH:MM") => minutes` |
| `ni` | `dateTimeIso` | `(key, minutes) => ISO string` (minutes capped at 1439) |
| `xr`, `NV` | `nowIso` | `() => ISO string` now |
| `GV` | `monthEndKey` | `("YYYY-MM") => "YYYY-MM-DD"` last day |
| `Ko` | `buildPeriod` | `(gran, key) => {gran,key,label,title,from,to,partial}` |
| `$s` | `shiftPeriod` | `(period, steps) => period` (day steps skip weekends) |
| `hf` | `currentPeriod` | `(gran) => period` |
| `QV` | `resolvePeriod` | `(gran, "current"\|"previous"\|key) => period` |
| `qw` | `recentPeriods` | `(gran, count, endKey?) => period[]` oldest first |

## constants.js (also re-exported by seed.js / domain.js where noted)

| Minified | New name | Description |
|---|---|---|
| `xn` | `isLeadership` | `(role) => boolean` true for `manager` / `founder` (also exported from domain.js) |
| `Cn` | `TASK_TYPES` | built-in task types `{id,name,unit,perUnit,ideal,variants?}` (also from seed.js) |
| `pV` | `VARIANT_PER_UNIT` | per-unit minutes per 1st-level-message variant |
| `Qe` | `PEOPLE` | the 10 people `{id,name,role,title,color,history}` (also from seed.js) |
| `mV` | `PERSON_IDS` | `PEOPLE` ids |
| `Wo`, `Dg` | `roleOf` | `(personId) => role \| undefined` (also exported from domain.js) |
| `eU` | `DEFAULT_THEME` | default personalisation `{base,accent,background,font,cards,nowEmoji,blocks}` |

## domain.js

| Minified | New name | Description / signature |
|---|---|---|
| `Tn` | `newId` | `() => string` random id |
| `cf`, `wV` | `DEFAULT_METRICS` | `{id,label}[]` the 7 default tracked numbers |
| `Cd` | `EMPTY_COUNTS` | `{}` (always spread) |
| `tc` | `metricTracksPeriod` | `(metric, "week"\|"month") => boolean` |
| `Ig` | `pickMetrics` | `(...ids) => metric[]` |
| `On` | `makeCounts` | `(messages,responses,l2,calls,interest,meetings,decks) => counts` |
| `ea` | `canManageProject` | `(project, personId) => boolean` owner / admin / leadership |
| `vV` | `isProjectOwner` | `(project, personId) => boolean` |
| `xV` | `isProjectAdmin` | `(project, personId) => boolean` |
| `nc` | `TRACKED_PEOPLE_IDS` | ids of non manager/founder people (resources and PMs) |
| `RV` | `staticPersonName` | `(id) => name` from the directory (ignores profile edits) |
| `iU` | `activeProjectsFor` | `(projects, personId) => project[]` |
| `gb` | `finalizeProjectsForDay` | `(projects, personId, day, at, daily?) => projects` |
| `df` | `weekTargetFor` | `(project, dateKey) => counts` planned or default weekly target |
| `bV` | `weekDayStatus` | `(project, week = thisWeek) => {date,label,finalized,at}[5]` |
| `Dw` | `projectWeeks` | `(project, weeksAhead = 4) => {n,start,end,label,plannedAhead}[]` |
| `kV` | `rollProjectPeriods` | `(project) => project` rolls week / month counters into past lists |
| `Rw` | `DEFAULT_STANDARDS` | `{prospect:2, l1:2, l2:1.5}` |
| `SV` | `VARIANT_FACTORS` | l1 variant multipliers |
| `$h` | `standardMinutes` | `(typeId, qty, variant?, standards?) => minutes` |
| `La` | `findCustomStandard` | `(project, idOrName) => standard \| undefined` |
| `ss` | `computeStandardMinutes` | `(project, typeId, qty, variant?, customRef?) => minutes \| null` |
| `ff` | `defaultTaskTitle` | `(typeId, qty, variant?) => string` |
| `rc` | `isSubmitted` | `(task) => boolean` status done or in_review |
| `LV` | `wasOnTime` | `(task) => boolean \| null` |
| `PR` (23274) | `onTimeSummary` | `(tasks) => {onTime,total,pct} \| null` |
| `cU` (23292) | `minutesSaved` | `(task) => number \| null` |
| `dU` (23296) | `TASK_TYPE_METRICS` | task type -> metric ids it feeds |
| `FV` | `DIFFICULTY_LABELS` | `{easy,standard,challenging}` -> label |
| `Jl` | `DIFFICULTY_THRESHOLD_PCT` | `10` |
| `Lw` | `difficultyLevel` | `(targetMinutes, standardMinutes) => {level, pct}` |
| `BV` | `taskDifficulty` | `(task) => {level, pct}` |
| `gR` | `difficultySummary` | `(tasks) => {easy,standard,challenging,total,pct:{...}}` |
| `yR` | `filterTasks` | `(tasks, {assignedBy,assigneeId,projectId,from,to}) => tasks` |
| `zV` | `difficultyForState` | `(state, filter?) => summary` |
| `vR` | `difficultyByAssigner` | `(state, filter?) => ({assignerId,...summary})[]` |
| `Fw` | `taskBreakdownKey` | `(task) => {key,label,unit,order}` |
| `xR` | `percent` | `(actual, target) => number` |
| `bR` | `targetVsActualRows` | `(tasks, assigneeId, from, to, {projectId?, includeHistoric?}) => rows` |
| `wR` | `buildSnapshot` | `(rows, customTargets?, customActuals?, at?) => {byType, at}` |
| `Ih` | `dailySnapshot` | `(tasks, personId, day, dailyEntry, at?) => snapshot` |
| `Bw` | `weeklySnapshot` | `(tasks, personId, week, weeklyEntry, at?) => snapshot` |
| `Ho` | `snapshotRows` | `(snapshot) => rows` |
| `jR` | `blankActuals` | `(rows) => rows` with actual / pct null |
| `qV` | `dailyReport` | `(state, personId, day) => {targetsSet,targetsAt,sent,sentAt,rows}` |
| `VV` | `weeklyReport` | `(state, personId, week) => same shape` |
| `UV` | `dailyCompletion` | `(state, day, people?) => {total,targetsSet,eodSent}` |
| `WV` | `weeklyCompletion` | `(state, week, people?) => {total,targetsSet,eowSent}` |
| `HV` | `projectEodStatus` | `(project, state, day?) => {sent, pending}` |
| `zw` | `dayHours` | `(dailyEntry) => {plannedMin,actualMin,extraMin,sent}` |
| `kR` | `weekHours` | `(state.daily, personId, week) => {plannedMin,actualMin,extraMin,days}` |
| `Go` | `METRIC_KEYS` | `["onTime","tasks","hours","extra","resubmits"]` |
| `Yo` | `METRIC_LABELS` | key -> label |
| `Ca` | `METRIC_HELP` | key -> description |
| `ZV` | `METRIC_DIRECTION` | key -> 1 / 0 / -1 |
| `Vw` | `formatMetric` | `(key, value) => string` |
| `pb` | `roundOneDecimal` | `(n) => n` |
| `pf` | `personMetrics` | `(personTasks, daily, personId, from, to) => metrics` |
| `Dh` | `metricSeries` | `(state, personId, gran, metric, count, {end}?) => {key,label,title,partial,value}[]` |
| `SR` | `metricSeriesFull` | `(state, personId, gran, count, {end}?) => [...all metrics]` |
| `mb` | `SPOTLIGHT_TAGS` | `{acknowledge:"⭐ Acknowledge", support:"🚩 Needs support"}` |
| `Md` | `percentileValue` | `(sortedArray, q) => value` |
| `ic` | `spotlight` | `(state, gran, which = "current", {people?}) => rows with tag / tagReason / change / prev` |
| `JV` | `timeBreakdown` | `(state, {from,to,personId?}) => {byProject, byType, totalMin}` |
| `mf` | `emptyWeekly` | `() => weekly record` |
| `ar` | `emptyDaily` | `() => daily record` |
| `tU`, `nU` | `ALIAS_ANIMALS`, `ALIAS_ADJECTIVES` | chat alias word lists |
| `rU` | `randomAlias` | `() => "Calm Otter"` |
| `OP` | `validateHours` | `(hoursMap) => hoursMap` (0-12, quarter hours) |
| `Rg` | `validateCustomStandards` | `(list) => list` |
| `Lg` | `validateTargets` | `(counts) => counts` |
| `TP` | `formatMinutes` | `(minutes) => "1h 5m"` |
| `uU` | `desktopNotify` | `(body) => void` browser Notification if granted |

## seed.js

| Minified | New name | Description / signature |
|---|---|---|
| `jV` | `seedProject` | `(template, seed) => project` adds past weeks / months, scaled week / month |
| `hR` | `buildDemoProjects` | `() => project[3]` Northwind, Helios, BD |
| `NV` | `seedNowIso` (= `nowIso`) | |
| `fb` | `makeTask` | `(id,typeId,qty,assigneeId,projectId,assignedById,status,extra?) => task` |
| `pR` | `applyTaskTimeline` | `(task, {assignedAt,reviewer,submits,feedback,forward,approvedAt,reminded}) => task` |
| `mR` | `PERSON_PROJECTS` | person -> project ids |
| `PV` | `PROJECT_PM` | project -> owner |
| `AV` | `PERFORMANCE_PROFILES` | per-person on-time / volume / resubmit curves |
| `_V` | `DIFFICULTY_MIX` | assigner -> [challenging share, easy share] |
| `OV` | `FEEDBACK_NOTES` | |
| `TV` | `FORWARD_NOTES` | |
| `EV` | `buildHistoricTasks` | `(projects) => task[]` 65 weekdays of approved history |
| `CV` | `buildDemoTasks` | `(projects?) => task[]` |
| `MV` | `buildTodayTasks` | `(projects) => task[]` hand-written t1..t27 |
| `NR` | `defaultPlanBlocks` | `(projects, personId) => block[]` |
| `aU` | `buildHistoricDaily` | `(projects, tasks) => daily map` |
| `oU` | `buildDemoWeekly` | `(tasks) => weekly map` |
| `sU` | `buildTodayDailyBase` | `() => daily map` (Alok, Abisho, Prajwal today) |
| `lU` | `buildDemoDaily` | `(projects, tasks) => daily map` |
| `Fg` | `buildInitialState` | `() => state` the full demo state (no actions) |

## Not ported (library code replaced by npm packages)

`lR` (zustand `create`), `$V`/`hb`/`IV`/`DV` (zustand persist middleware) are replaced by the
`zustand` package. Lines at/after 23304 (`fU` week/month range helper, `AR` and friends) belong to
the UI region and were not ported.

## Identifiers used in the range but defined outside it

| Minified | Defined at | What was done |
|---|---|---|
| `xn`, `Cn`, `pV`, `Qe`, `mV`, `Wo` | bundle 19781-19928 | ported to `lib/constants.js` (`isLeadership`, `TASK_TYPES`, `VARIANT_PER_UNIT`, `PEOPLE`, `PERSON_IDS`, `roleOf`) |
| `$w` | bundle 19929 | ported to `lib/dates.js` as `MONTH_SHORT` |
| `eU` | 21637 (in range) | `DEFAULT_THEME` in constants.js |
| `lR` | 18933 | zustand `create` |
| `window`, `Notification`, `localStorage`, `console` | browser globals | used as-is (store guards `typeof window`) |

Other bundle names near 19700-19780 (`Mw`, `OI`, `Ya`, `uR`, `_I`, `Vr`, `Ye`, `sR`, `Mh`, `hV`) are
UI components and are not used by the ported code.
