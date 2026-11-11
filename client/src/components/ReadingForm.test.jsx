import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReadingForm from './ReadingForm.jsx';
import { ApiError } from '../api/client.js';

function setup(onSubmit = vi.fn().mockResolvedValue()) {
  const user = userEvent.setup();
  render(<ReadingForm onSubmit={onSubmit} />);
  return {
    user,
    onSubmit,
    value: screen.getByLabelText(/value/i),
    date: screen.getByLabelText(/date/i),
    slot: screen.getByLabelText(/time slot/i),
    submit: screen.getByRole('button', { name: /add reading/i }),
  };
}

describe('ReadingForm', () => {
  test('shows an error when the value is empty', async () => {
    const { user, submit, onSubmit } = setup();
    await user.click(submit);
    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows an error when the value is out of range', async () => {
    const { user, value, submit, onSubmit } = setup();
    await user.type(value, '700');
    await user.click(submit);
    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('shows an error when the date is in the future', async () => {
    const { user, date, value, submit, onSubmit } = setup();
    await user.clear(date);
    await user.type(date, '2999-01-01');
    await user.type(value, '120');
    await user.click(submit);
    expect(screen.getByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits a valid reading as a number and clears the value', async () => {
    const { user, slot, value, submit, onSubmit } = setup();
    await user.selectOptions(slot, 'after_lunch');
    await user.type(value, '135');
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ slot: 'after_lunch', value: 135 }));
    expect(value).toHaveValue(null);
  });

  test('shows server-side errors such as a duplicate slot', async () => {
    const message = 'You already have an After lunch reading for this date.';
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, message, { slot: message }));
    const { user, value, submit } = setup(onSubmit);
    await user.type(value, '140');
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
