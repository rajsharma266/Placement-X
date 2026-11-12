import { Construction } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/StatePanel';
import Button from '../components/ui/Button';

const FeaturePlaceholderPage = ({ title, description }) => <div className="space-y-8"><PageHeader eyebrow="STUDENT WORKSPACE" title={title} description={description} /><EmptyState icon={Construction} title={`${title} is coming next`} description="This area is prepared in your workspace. Continue with the dashboard recommendations while we build this focused experience." action={<Link to="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link>} /></div>;
export default FeaturePlaceholderPage;
