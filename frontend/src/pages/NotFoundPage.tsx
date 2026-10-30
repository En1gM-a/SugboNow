import { ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';

export default function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Page not found" />
      <Card>
        <EmptyState title="We couldn’t find that page" action={<ButtonLink to="/">Back to today</ButtonLink>}>
          The link may be old or mistyped.
        </EmptyState>
      </Card>
    </div>
  );
}
