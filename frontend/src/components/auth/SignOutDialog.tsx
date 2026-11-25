import type { ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';

interface SignOutDialogProps {
  open: boolean;
  onClose: () => void;
  signOut: () => Promise<void>;
  /** What signing out means here. */
  children?: ReactNode;
}

/** Asks before signing out. Every way to sign out opens this one. */
export function SignOutDialog({
  open,
  onClose,
  signOut,
  children = 'You can sign back in any time. Your places and trips stay saved.',
}: SignOutDialogProps) {
  async function confirm() {
    try {
      await signOut();
    } catch {
      toast.error("Couldn't sign you out. Check your connection and try again.");
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title="Sign out of SugboNow?"
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
      onConfirm={confirm}
      onClose={onClose}
    >
      {children}
    </ConfirmDialog>
  );
}
