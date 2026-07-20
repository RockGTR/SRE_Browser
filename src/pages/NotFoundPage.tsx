import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <main className="page">
      <EmptyState title="Page not found" message="This route is not part of the H-1B SRE Browser." />
      <p className="center"><Link className="primary-link" to="/">Return to overview</Link></p>
    </main>
  );
}
