// Lightweight ATS-style skill matcher.
// Compares the skills a job requires against the skills a candidate has
// listed on their profile, and returns a percentage match plus the matched
// and missing skill lists so companies can see *why* a candidate scored
// the way they did.

const normalize = (arr = []) =>
  arr
    .map((s) => String(s || "").trim().toLowerCase())
    .filter(Boolean);

/**
 * @param {string[]} jobSkills       Skills required by the job posting
 * @param {string[]} candidateSkills Skills listed on the candidate's profile
 * @returns {{ score: number|null, matched: string[], missing: string[] }}
 *   score is null when the job hasn't specified any required skills
 *   (nothing to match against, so we don't penalize the candidate).
 */
function computeSkillMatch(jobSkills, candidateSkills) {
  const required = normalize(jobSkills);
  if (required.length === 0) {
    return { score: null, matched: [], missing: [] };
  }

  const have = new Set(normalize(candidateSkills));
  const matched = required.filter((s) => have.has(s));
  const missing = required.filter((s) => !have.has(s));
  const score = Math.round((matched.length / required.length) * 100);

  return { score, matched, missing };
}

module.exports = { computeSkillMatch };
