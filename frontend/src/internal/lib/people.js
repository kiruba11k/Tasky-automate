import { PEOPLE, PERSON_IDS, isLeadership } from "./constants.js";
import { TRACKED_PEOPLE_IDS } from "./domain.js";

/** Replaces the organisation's people (from the backend). The arrays are mutated in place, so every importer sees the change. */
export function setPeople(list) {
  PEOPLE.splice(0, PEOPLE.length, ...list);
  PERSON_IDS.splice(0, PERSON_IDS.length, ...list.map((p) => p.id));
  TRACKED_PEOPLE_IDS.splice(0, TRACKED_PEOPLE_IDS.length, ...list.filter((p) => !isLeadership(p.role)).map((p) => p.id));
}
