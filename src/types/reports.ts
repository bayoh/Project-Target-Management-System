import type { ChartType } from 'chart.js';

export interface TableConfig {
  dataSource: {
    table: string;
    columns: Array<{
      field: string;
      header: string;
      width?: number;
      align?: 'left' | 'center' | 'right';
      format?: 'text' | 'date' | 'number' | 'currency';
    }>;
    filter?: {
      field: string;
      operator: 'equals' | 'contains' | 'greater' | 'less';
      value: string | number;
    }[];
    sort?: {
      field: string;
      direction: 'asc' | 'desc';
    }[];
    pagination?: {
      enabled: boolean;
      pageSize: number;
    };
  };
  style?: {
    borders?: boolean;
    striped?: boolean;
    hover?: boolean;
    header?: {
      background?: string;
      textColor?: string;
    };
    row?: {
      background?: string;
      alternateBackground?: string;
      textColor?: string;
    };
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  layout: ReportLayout;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportLayout {
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  type: 'header' | 'content' | 'footer';
  elements: ReportElement[];
}

export interface ReportElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'chart' | 'status' | 'timeline' | 'data';
  content: string;
  style: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
  };
  dataMapping?: DataMapping;
  chartConfig?: ChartConfig;
  tableConfig?: TableConfig;
}

export interface ChartConfig {
  type: ChartType;
  options: {
    title?: string;
    xAxis?: string;
    yAxis?: string;
    labels?: string[];
    colors?: string[];
    scales?: {
      x?: {
        title?: string;
        min?: number;
        max?: number;
      };
      y?: {
        title?: string;
        min?: number;
        max?: number;
      };
    };
    plugins?: {
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled?: boolean;
      };
    };
  };
}

export interface DataMapping {
  source: 'intervention' | 'action' | 'task' | 'indicator';
  field?: string;
  table?: string;
  query?: string;
  aggregation?: {
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
    field: string;
    groupBy: string;
  };
}

export interface GeneratedReport {
  id: string;
  template_id: string;
  intervention_id: string;
  data: unknown;
  created_by: string;
  created_at: string;
}