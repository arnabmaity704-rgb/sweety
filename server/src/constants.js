// The four daily time slots. `key` is stored in the database, `label` is shown to users.
const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
];

const SLOT_KEYS = SLOTS.map((s) => s.key);
const SLOT_LABELS = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]));

const MIN_VALUE = 40;
const MAX_VALUE = 600;
const MAX_READINGS_PER_DAY = 4;

const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueNotWhole: `Value must be a whole number between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  valueOutOfRange: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  dateRequired: 'Please select a date.',
  dateInvalid: 'Please enter a valid date (YYYY-MM-DD).',
  dateInFuture: 'Date cannot be in the future.',
  slotInvalid: 'Please choose a valid time slot.',
  maxPerDay: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
  duplicateSlot: (label) => {
    const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
    return `You already have ${article} ${label} reading for this date.`;
  },
};

module.exports = { SLOTS, SLOT_KEYS, SLOT_LABELS, MIN_VALUE, MAX_VALUE, MAX_READINGS_PER_DAY, MESSAGES };
