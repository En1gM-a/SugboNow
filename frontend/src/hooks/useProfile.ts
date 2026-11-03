import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { queries } from '@/lib/queries';

/** The signed-in user's profile. It never goes stale on its own; invalidate it after your own edits. */
export function useProfile() {
  const { status } = useAuth();
  return useQuery({ ...queries.profile(), enabled: status === 'signedIn' });
}
