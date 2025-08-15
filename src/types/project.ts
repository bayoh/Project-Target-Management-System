export type ProjectStatus = 'not_started' | 'in_progress' | 'at_risk' | 'completed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type IndicatorType = 'quantitative' | 'qualitative';

export interface BaseEntity {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Project extends BaseEntity {
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
}

export interface Cluster extends BaseEntity {
  name: string;
  code: number;
  description: string | null;
  pathways?: Pathway[];
}

export interface Pathway extends BaseEntity {
  cluster_id: string;
  name: string;
  code: number;
  description: string | null;
  interventions?: Intervention[];
}

export interface Intervention extends BaseEntity {
  pathway_id: string;
  name: string;
  code: number;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  lead_id: string | null;
  actions?: Action[];
}

export interface Action extends BaseEntity {
  intervention_id: string;
  name: string;
  code: number;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  actual_startDate: string | null;
  actual_endDate: string | null;
  end_date: string | null;
  lead_id: string | null;
  supporting_staff: string[];
  issues: string[];
  needs: string[];
  comments: string[];
  tasks?: Task[];
  budget: number | null;
  actual_budget: number | null;
  associated_projects: string[];
  implementing_partners: string[];
  indicators?: Indicator[];
}

export interface Task extends BaseEntity {
  action_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  due_date: string | null;
}

export interface Indicator extends BaseEntity {
  action_id: string;
  name: string;
  description: string | null;
  type: IndicatorType;
  target_value: number | null;
  target_date: string | null;
  category: string | null;
  subcategory: string | null;
  unit: string | null;
  reports?: IndicatorReport[];
}

export interface IndicatorReport extends BaseEntity {
  indicator_id: string;
  report_date: string;
  quantitative_value: number | null;
  qualitative_value: string | null;
  supporting_documents: Record<string, unknown> | null;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: string;
}