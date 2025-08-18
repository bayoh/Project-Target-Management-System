import { IssueDashboard} from '../../components/issues/issueDashboard';


export function Issue() {

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto p-6">
        <IssueDashboard />
      </div>
    </div>
  );
}