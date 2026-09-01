import { resolveMissingPrerequisites } from './prerequisiteService';

const FUNDAMENTALS = 'course-fundamentals';
const FUNDAMENTALS_2024 = 'course-fundamentals-2024';
const FUNDAMENTALS_WEEKEND = 'course-fundamentals-weekend';
const UNRELATED = 'course-unrelated';

/** Every offering of the same academic course shares one group. */
const equivalentGroup = () =>
  new Map([
    [FUNDAMENTALS, new Set([FUNDAMENTALS, FUNDAMENTALS_2024, FUNDAMENTALS_WEEKEND])],
  ]);

describe('resolveMissingPrerequisites', () => {
  it('reports the prerequisite as missing when nothing is completed', () => {
    expect(
      resolveMissingPrerequisites([FUNDAMENTALS], equivalentGroup(), new Set()),
    ).toEqual([FUNDAMENTALS]);
  });

  it('accepts the exact prerequisite course', () => {
    expect(
      resolveMissingPrerequisites([FUNDAMENTALS], equivalentGroup(), new Set([FUNDAMENTALS])),
    ).toEqual([]);
  });

  it('accepts a different offering in the same equivalence group', () => {
    expect(
      resolveMissingPrerequisites(
        [FUNDAMENTALS],
        equivalentGroup(),
        new Set([FUNDAMENTALS_2024]),
      ),
    ).toEqual([]);
  });

  it('does not accept an unrelated completed course', () => {
    expect(
      resolveMissingPrerequisites([FUNDAMENTALS], equivalentGroup(), new Set([UNRELATED])),
    ).toEqual([FUNDAMENTALS]);
  });

  it('falls back to identity matching when a course has no equivalence group', () => {
    expect(
      resolveMissingPrerequisites([UNRELATED], new Map(), new Set([UNRELATED])),
    ).toEqual([]);
    expect(resolveMissingPrerequisites([UNRELATED], new Map(), new Set())).toEqual([UNRELATED]);
  });

  it('requires every prerequisite, not just one', () => {
    const map = new Map([
      [FUNDAMENTALS, new Set([FUNDAMENTALS, FUNDAMENTALS_2024])],
      [UNRELATED, new Set([UNRELATED])],
    ]);

    expect(
      resolveMissingPrerequisites([FUNDAMENTALS, UNRELATED], map, new Set([FUNDAMENTALS_2024])),
    ).toEqual([UNRELATED]);
  });

  it('is satisfied when there are no prerequisites', () => {
    expect(resolveMissingPrerequisites([], new Map(), new Set())).toEqual([]);
  });
});
