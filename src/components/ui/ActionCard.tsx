
import { Eye, Edit2, Trash2, Calendar, User} from 'lucide-react';
import { Card, CardContent, CardHeader } from './card';
import { Button } from './button';
import type { Action, Intervention } from '../../types/project';
import type { User as UserType } from '../../types/auth';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { StatusBadge } from './statusBadge';

interface ActionCardProps {
  action: Action;
  users: UserType[];
  interventions: Intervention[];
  onView: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (actionId: string) => void;
  className?: string;
}

export function ActionCard({
  action,
  users,
  onView,
  onEdit,
  onDelete,
  className = ''
}: ActionCardProps) {
  // const intervention = interventions.find(i => i.id === action.intervention_id);
  const lead = users.find(u => u.id === action.lead_id);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (

    <Card className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full overflow-hidden ${className}`}>
      <CardHeader className="p-6 pb-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p
                    className="text-md font-semibold text-gray-900 break-words overflow-hidden line-clamp-2 lg:line-clamp-3"
                  >
                    {action.name}
                  </p>
                </TooltipTrigger>
                {action.name && (
                  <TooltipContent side="top" className="max-w-xs md:max-w-md lg:max-w-lg bg-gray-900 text-white">
                    <p className="whitespace-pre-wrap">{action.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <StatusBadge status={action.status}/>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 flex-1 flex flex-col">
        <div className="space-y-4 flex-1 mb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className="text-sm text-gray-600 leading-relaxed break-words overflow-hidden line-clamp-2 md:line-clamp-3 xl:line-clamp-4"
              >
                {action.description || 'Not Set'}
              </p>
            </TooltipTrigger>
            {(action.description ?? '').length > 0 && (
              <TooltipContent side="top" className="max-w-xs md:max-w-md lg:max-w-lg bg-gray-900 text-white">
                <p className="whitespace-pre-wrap">{action.description}</p>
              </TooltipContent>
            )}
          </Tooltip>
          
          {/* Lead */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-700">Lead:</span>
            <span className="text-gray-600">{lead?.full_name || 'Not set'}</span>
          </div>
        
        </div>

        {/* Bottom section with date and issues - now sticks to bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-1 text-xs text-red-500">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(action.end_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(action)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                title="Edit action"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => onDelete(action.id)}
                 className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                 title="Delete action"
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
              
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Button
                onClick={() => onView(action)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                title="View action"
                variant="outline"
                size="lg"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ActionCard;