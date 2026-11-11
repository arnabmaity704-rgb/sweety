const { validateValue, validateDate, validateReading, validateRegistration } = require('../src/utils/validation');

const TODAY = '2026-10-15';

describe('validateValue', () => {
  test.each([undefined, null, '', '   '])('requires a value (%p)', (value) => {
    expect(validateValue(value)).toBe('Please enter a glucose value.');
  });

  test.each([39, 601, 0, -5, '700'])('rejects out-of-range value %p', (value) => {
    expect(validateValue(value)).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test.each([120.5, '99.9', 'abc', true])('rejects non-whole value %p', (value) => {
    expect(validateValue(value)).toBe('Value must be a whole number between 40 and 600 mg/dl.');
  });

  test.each([40, 600, 123, '250'])('accepts valid value %p', (value) => {
    expect(validateValue(value)).toBeNull();
  });
});

describe('validateDate', () => {
  test('accepts today and past dates', () => {
    expect(validateDate(TODAY, TODAY)).toBeNull();
    expect(validateDate('2026-01-01', TODAY)).toBeNull();
  });

  test('rejects future dates', () => {
    expect(validateDate('2026-10-16', TODAY)).toBe('Date cannot be in the future.');
  });

  test.each(['2026-02-30', '15-10-2026', 'yesterday'])('rejects invalid date %p', (value) => {
    expect(validateDate(value, TODAY)).toBe('Please enter a valid date (YYYY-MM-DD).');
  });
});

describe('validateReading', () => {
  test('returns cleaned data for a valid reading', () => {
    const result = validateReading({ date: TODAY, slot: 'after_lunch', value: '140' }, TODAY);
    expect(result).toEqual({ errors: null, data: { date: TODAY, slot: 'after_lunch', value: 140 } });
  });

  test('collects an error for every invalid field', () => {
    const { errors } = validateReading({ date: '2030-01-01', slot: 'midnight', value: '' }, TODAY);
    expect(errors).toEqual({
      date: 'Date cannot be in the future.',
      slot: 'Please choose a valid time slot.',
      value: 'Please enter a glucose value.',
    });
  });
});

describe('validateRegistration', () => {
  test('flags missing name, bad email and short password', () => {
    expect(validateRegistration({ name: '', email: 'nope', password: '123' })).toEqual({
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.',
      password: 'Password must be at least 6 characters.',
    });
  });
});
