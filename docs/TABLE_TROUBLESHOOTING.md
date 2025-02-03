# Table Data Source Selection Troubleshooting Guide

## Current Behavior
- Data source selection options are not displaying in the table configuration panel
- The dropdown menu appears empty or shows only the "Select a data source" placeholder
- No available tables are listed for selection

## Expected Behavior
- Data source dropdown should display all available data sources:
  - Interventions
  - Actions
  - Tasks
  - Indicators
  - Indicator Reports
- Each data source should be selectable
- Upon selection, relevant column fields should become available

## System Details
- Application Version: 1.0.0
- Browser Requirements: Modern browsers (Chrome, Firefox, Safari, Edge)
- Dependencies:
  - React 18.3.1
  - Supabase Client 2.39.7
  - TypeScript 5.5.3

## Recent Changes
1. Implementation of the TableConfig component
2. Addition of data source mapping types
3. Integration with report template designer

## Common Issues and Solutions

### 1. Data Source Not Loading

#### Symptoms
- Empty dropdown menu
- No data sources available for selection

#### Troubleshooting Steps
1. Check Console for Errors
   ```typescript
   console.log('Available Data Sources:', DATA_SOURCES);
   console.log('Current Config:', config);
   ```

2. Verify Data Source Constants
   ```typescript
   // Should be defined in TableConfig.tsx
   const DATA_SOURCES = [
     { table: 'interventions', label: 'Interventions' },
     { table: 'actions', label: 'Actions' },
     { table: 'tasks', label: 'Tasks' },
     { table: 'indicators', label: 'Indicators' },
     { table: 'indicator_reports', label: 'Indicator Reports' },
   ];
   ```

3. Validate Component Props
   ```typescript
   // Check if config prop is properly passed
   console.log('Table Config Props:', {
     config,
     hasDataSource: Boolean(config?.dataSource),
     selectedTable: config?.dataSource?.table
   });
   ```

### 2. Selection Not Persisting

#### Symptoms
- Selected data source resets after component re-render
- Changes not reflected in the template

#### Troubleshooting Steps
1. Check onChange Handler
   ```typescript
   // Verify the onChange callback is properly updating the parent state
   onChange({
     ...config,
     dataSource: {
       ...config.dataSource,
       table: selectedTable,
       columns: []
     }
   });
   ```

2. Verify Parent Component Update
   ```typescript
   // In ReportTemplateDesigner.tsx
   const updateElement = (elementId: string, updates: Partial<ReportElement>) => {
     console.log('Updating element:', { elementId, updates });
     // Rest of the update logic
   };
   ```

### 3. Column Fields Not Loading

#### Symptoms
- Data source selected but no column fields available
- Column configuration options missing

#### Troubleshooting Steps
1. Check Column Fields Mapping
   ```typescript
   console.log('Available Columns:', COLUMN_FIELDS[config.dataSource.table]);
   ```

2. Verify Column State Updates
   ```typescript
   const handleColumnChange = (index: number, updates: Partial<TableConfig['dataSource']['columns'][0]>) => {
     console.log('Column Update:', { index, updates });
     // Rest of the update logic
   };
   ```

## Access Permissions
To use the table configuration:

1. Required Permissions:
   - Read access to all referenced tables
   - Authentication token present and valid
   - Proper role assignments

2. Verify Authentication:
   ```typescript
   const checkAuth = async () => {
     const { data: { user } } = await supabase.auth.getUser();
     console.log('Current User:', user);
     return Boolean(user);
   };
   ```

3. Check Table Access:
   ```typescript
   const verifyTableAccess = async (table: string) => {
     const { data, error } = await supabase
       .from(table)
       .select('id')
       .limit(1);
     
     return { hasAccess: !error, error };
   };
   ```

## Additional Resources
- Component Documentation: `/src/components/reports/TableConfig.tsx`
- Type Definitions: `/src/types/reports.ts`
- Database Schema: `/supabase/migrations/`

## Support
If issues persist after following this guide:
1. Check browser console for errors
2. Verify all required dependencies are installed
3. Ensure Supabase connection is properly configured
4. Contact system administrator for permission-related issues