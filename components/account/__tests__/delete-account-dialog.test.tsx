import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Component to be implemented later (Task 6.11)
// eslint-disable-next-line import/no-unresolved
import { DeleteAccountDialog } from '../delete-account-dialog';

describe('DeleteAccountDialog', () => {
  it('renders confirmation dialog and triggers deletion on confirm', async () => {
    const onDeleted = jest.fn();
    render(<DeleteAccountDialog onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('cancels deletion when user clicks cancel', async () => {
    const onDeleted = jest.fn();
    render(<DeleteAccountDialog onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(onDeleted).not.toHaveBeenCalled();
    });
  });
});


