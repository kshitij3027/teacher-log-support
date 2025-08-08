"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccountDeletion } from '@/hooks/use-account-deletion';

type Props = { onDeleted?: () => void };

export function DeleteAccountDialog({ onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const { deleteAccount } = useAccountDeletion();

  const handleConfirm = async () => {
    await deleteAccount();
    if (onDeleted) onDeleted();
    setOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Delete Account</Button>
      {open && (
        <div role="dialog" aria-modal="true">
          <p>Are you sure?</p>
          <Button onClick={handleConfirm}>Confirm</Button>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}


