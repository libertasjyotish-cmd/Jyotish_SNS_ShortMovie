/**
 * Archiving deletes rows from the live sheet, so it must only take rows nothing touches again,
 * and writes prepared before a delete must still land on their own row.
 */
import {
  ARCHIVE_AFTER_DAYS,
  ARCHIVE_STORIES_AFTER_DAYS,
  planQueueArchive,
  planStoryArchive,
  relocateRows,
} from '../src/lib/archive';

const now = new Date('2026-11-22T00:00:00Z');
const failures: string[] = [];
const expect = (ok: boolean, label: string) => {
  if (!ok) failures.push(label);
};

const old = '2026-W42';
const recent = '2026-W46';
const refs = (value: object[]) => JSON.stringify(value);
const row = (task_id: string, extra: Record<string, string>) => ({
  task_id,
  week_id: old,
  target_type: 'Theme',
  post_status: 'Posted',
  render_status_30s: 'Rendered',
  render_status_65s: 'Pending',
  ...extra,
});

const ids = planQueueArchive(
  [
    row('done-theme', {}),
    row('recent', { week_id: recent }),
    row('bad-week', { week_id: '' }),
    row('rendering', { render_status_30s: 'Rendering' }),
    row('sign-expired', { target_type: 'Zodiac_Sign', expired_at: '2026-10-30' }),
    row('sign-tiktok-only', {
      target_type: 'Zodiac_Sign',
      posted_refs: refs([{ platform: 'YouTube', post_id: '1', retired: true }, { platform: 'TikTok', post_id: '2' }]),
    }),
    row('sign-awaiting', {
      target_type: 'Zodiac_Sign',
      posted_refs: refs([{ platform: 'Instagram', post_id: '3' }]),
    }),
    row('sign-awaiting-long', {
      week_id: '2026-W30',
      target_type: 'Zodiac_Sign',
      posted_refs: refs([{ platform: 'Instagram', post_id: '4' }]),
    }),
    row('dup', {}),
    row('dup', { week_id: recent }),
    row('never-posted', { post_status: 'Hold' }),
  ],
  now,
);
for (const id of ['done-theme', 'sign-expired', 'sign-tiktok-only', 'sign-awaiting-long', 'never-posted'])
  expect(ids.has(id), `${id} should be archived`);
for (const id of ['recent', 'bad-week', 'rendering', 'sign-awaiting', 'dup'])
  expect(!ids.has(id), `${id} must stay in the sheet`);
expect(ARCHIVE_AFTER_DAYS >= 28, 'a week must be over for weeks before it is archived');

const day = 86_400_000;
const at = (days: number) => new Date(now.getTime() - days * day).toISOString();
const stories = planStoryArchive(
  [
    { story_id: 'a', platform: 'Instagram', status: 'Posted', updated_at: at(ARCHIVE_STORIES_AFTER_DAYS + 1) },
    { story_id: 'a', platform: 'Facebook', status: 'Posted', updated_at: at(1) },
    { story_id: 'b', platform: 'Instagram', status: 'Pending', updated_at: at(60) },
    { story_id: 'c', platform: 'Facebook', status: 'Failed', updated_at: at(30) },
  ],
  now,
);
expect(stories.has('a/Instagram') && stories.has('c/Facebook'), 'old finished stories should go');
expect(!stories.has('a/Facebook') && !stories.has('b/Instagram'), 'recent or pending stories stay');

// Rows 2-6 cached; rows 2 and 3 were archived before the write, row 7 was appended meanwhile.
const cached = [
  { rowNumber: 2, key: 'old1' },
  { rowNumber: 3, key: 'old2' },
  { rowNumber: 4, key: 'live' },
  { rowNumber: 5, key: 'dup' },
  { rowNumber: 6, key: 'dup' },
];
const fresh = ['task_id', 'live', 'dup', 'dup', 'new'];
const moved = relocateRows(cached, fresh, [4, 6, 7]);
expect(moved.join() === '2,4,7', `rows must follow their key after a delete, got ${moved.join()}`);
expect(relocateRows(cached, ['task_id', 'old1', 'old2', 'live', 'dup', 'dup'], [4]).join() === '4', 'unmoved rows keep their number');
let threw = false;
try {
  relocateRows(cached, fresh, [2]);
} catch {
  threw = true;
}
expect(threw, 'a write to an archived row must fail instead of hitting another row');

if (failures.length > 0) {
  console.error(`${failures.length} archive checks failed:`);
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}
console.log('check:archive ok');
