import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return <div className="page"><EmptyState title="Page not found" message="This route is not part of the H-1B SRE Careers Directory." /><p className="center"><Link className="employer-link" to="/">Return to the directory</Link></p></div>;
}
