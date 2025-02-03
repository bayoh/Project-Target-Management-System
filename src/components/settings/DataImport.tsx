import React, { useState } from 'react';
import { Upload, AlertTriangle, FileSpreadsheet, Check, Loader2, Download, Eye, X, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface ImportData {
  clusters: Array<{
    name: string;
    description?: string;
    pathways: Array<{
      name: string;
      description?: string;
      interventions: Array<{
        name: string;
        description?: string;
        status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
        start_date?: string;
        end_date?: string;
        budget?: number;
        actions: Array<{
          name: string;
          description?: string;
          status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
          start_date?: string;
          end_date?: string;
          budget?: number;
        }>;
      }>;
    }>;
  }>;
}

interface PruneModalState {
  isOpen: boolean;
  confirmText: string;
  acknowledged: boolean;
  inProgress: boolean;
}

export function DataImport() {
  const [importing, setImporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importStats, setImportStats] = useState<{
    clusters: number;
    pathways: number;
    interventions: number;
    actions: number;
  } | null>(null);
  const [previewData, setPreviewData] = useState<ImportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pruneModal, setPruneModal] = useState<PruneModalState>({
    isOpen: false,
    confirmText: '',
    acknowledged: false,
    inProgress: false
  });

  const validateImportData = (sheets: { [key: string]: any[][] }): ImportData => {
    const data: ImportData = { clusters: [] };
    const requiredSheets = ['Clusters', 'Pathways', 'Interventions', 'Actions'];
    
    // Verify all required sheets exist
    for (const sheet of requiredSheets) {
      if (!sheets[sheet]) {
        throw new Error(`Missing required sheet: ${sheet}`);
      }
    }

    // Process Clusters
    const clusters = sheets['Clusters'].slice(1); // Skip header row
    for (const [name, description] of clusters) {
      if (!name) continue;
      data.clusters.push({
        name,
        description: description || undefined,
        pathways: []
      });
    }

    // Process Pathways
    const pathways = sheets['Pathways'].slice(1);
    for (const [clusterName, name, description] of pathways) {
      if (!clusterName || !name) continue;
      const cluster = data.clusters.find(c => c.name === clusterName);
      if (!cluster) {
        throw new Error(`Cluster not found: ${clusterName}`);
      }
      cluster.pathways.push({
        name,
        description: description || undefined,
        interventions: []
      });
    }

    // Process Interventions
    const interventions = sheets['Interventions'].slice(1);
    for (const [clusterName, pathwayName, name, description, status, startDate, endDate, budget] of interventions) {
      if (!clusterName || !pathwayName || !name) continue;
      const cluster = data.clusters.find(c => c.name === clusterName);
      if (!cluster) continue;
      const pathway = cluster.pathways.find(p => p.name === pathwayName);
      if (!pathway) continue;

      if (status && !['not_started', 'in_progress', 'at_risk', 'completed'].includes(status)) {
        throw new Error(`Invalid status for intervention "${name}": ${status}`);
      }

      pathway.interventions.push({
        name,
        description: description || undefined,
        status: (status as any) || 'not_started',
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? Number(budget) : undefined,
        actions: []
      });
    }

    // Process Actions
    const actions = sheets['Actions'].slice(1);
    for (const [clusterName, pathwayName, interventionName, name, description, status, startDate, endDate, budget] of actions) {
      if (!clusterName || !pathwayName || !interventionName || !name) continue;
      const cluster = data.clusters.find(c => c.name === clusterName);
      if (!cluster) continue;
      const pathway = cluster.pathways.find(p => p.name === pathwayName);
      if (!pathway) continue;
      const intervention = pathway.interventions.find(i => i.name === interventionName);
      if (!intervention) continue;

      if (status && !['not_started', 'in_progress', 'at_risk', 'completed'].includes(status)) {
        throw new Error(`Invalid status for action "${name}": ${status}`);
      }

      intervention.actions.push({
        name,
        description: description || undefined,
        status: (status as any) || 'not_started',
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? Number(budget) : undefined
      });
    }

    return data;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setImportStats(null);
    setPreviewData(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const sheets: { [key: string]: any[][] } = {};
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        sheets[sheetName] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }

      const importData = validateImportData(sheets);
      setPreviewData(importData);
      setShowPreview(true);
    } catch (err: any) {
      setValidationError(err.message || 'Invalid Excel file format');
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    await importDataToDatabase(previewData);
    setShowPreview(false);
    setPreviewData(null);
  };

  const importDataToDatabase = async (data: ImportData) => {
    setImporting(true);
    const stats = { clusters: 0, pathways: 0, interventions: 0, actions: 0 };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Import clusters and their hierarchies
      for (const cluster of data.clusters) {
        // Create cluster
        const { data: clusterData, error: clusterError } = await supabase
          .from('clusters')
          .insert([{
            name: cluster.name,
            description: cluster.description,
            created_by: user.id
          }])
          .select()
          .single();

        if (clusterError) throw clusterError;
        stats.clusters++;

        // Import pathways for this cluster
        for (const pathway of cluster.pathways) {
          const { data: pathwayData, error: pathwayError } = await supabase
            .from('pathways')
            .insert([{
              cluster_id: clusterData.id,
              name: pathway.name,
              description: pathway.description,
              created_by: user.id
            }])
            .select()
            .single();

          if (pathwayError) throw pathwayError;
          stats.pathways++;

          // Import interventions for this pathway
          for (const intervention of pathway.interventions) {
            const { data: interventionData, error: interventionError } = await supabase
              .from('interventions')
              .insert([{
                pathway_id: pathwayData.id,
                name: intervention.name,
                description: intervention.description,
                status: intervention.status,
                start_date: intervention.start_date,
                end_date: intervention.end_date,
                budget: intervention.budget,
                created_by: user.id
              }])
              .select()
              .single();

            if (interventionError) throw interventionError;
            stats.interventions++;

            // Import actions for this intervention
            for (const action of intervention.actions) {
              const { error: actionError } = await supabase
                .from('actions')
                .insert([{
                  intervention_id: interventionData.id,
                  name: action.name,
                  description: action.description,
                  status: action.status,
                  start_date: action.start_date,
                  end_date: action.end_date,
                  budget: action.budget,
                  created_by: user.id
                }]);

              if (actionError) throw actionError;
              stats.actions++;
            }
          }
        }
      }

      setImportStats(stats);
      toast.success('Data imported successfully');
    } catch (err) {
      console.error('Error importing data:', err);
      toast.error('Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    // Clusters sheet
    const clustersData = [
      ['Name', 'Description'],
      ['Example Cluster', 'Description of the cluster']
    ];
    const clustersSheet = XLSX.utils.aoa_to_sheet(clustersData);
    XLSX.utils.book_append_sheet(workbook, clustersSheet, 'Clusters');

    // Pathways sheet
    const pathwaysData = [
      ['Cluster Name', 'Name', 'Description'],
      ['Example Cluster', 'Example Pathway', 'Description of the pathway']
    ];
    const pathwaysSheet = XLSX.utils.aoa_to_sheet(pathwaysData);
    XLSX.utils.book_append_sheet(workbook, pathwaysSheet, 'Pathways');

    // Interventions sheet
    const interventionsData = [
      ['Cluster Name', 'Pathway Name', 'Name', 'Description', 'Status', 'Start Date', 'End Date', 'Budget'],
      ['Example Cluster', 'Example Pathway', 'Example Intervention', 'Description of the intervention', 'not_started', '2024-01-01', '2024-12-31', 50000]
    ];
    const interventionsSheet = XLSX.utils.aoa_to_sheet(interventionsData);
    XLSX.utils.book_append_sheet(workbook, interventionsSheet, 'Interventions');

    // Actions sheet
    const actionsData = [
      ['Cluster Name', 'Pathway Name', 'Intervention Name', 'Name', 'Description', 'Status', 'Start Date', 'End Date', 'Budget'],
      ['Example Cluster', 'Example Pathway', 'Example Intervention', 'Example Action', 'Description of the action', 'not_started', '2024-01-01', '2024-03-31', 10000]
    ];
    const actionsSheet = XLSX.utils.aoa_to_sheet(actionsData);
    XLSX.utils.book_append_sheet(workbook, actionsSheet, 'Actions');

    // Save the file
    XLSX.writeFile(workbook, 'data-import-template.xlsx');
  };

  const handlePruneData = async () => {
    if (pruneModal.confirmText !== 'CONFIRM DELETE' || !pruneModal.acknowledged) {
      return;
    }

    setPruneModal(prev => ({ ...prev, inProgress: true }));
    const toastId = toast.loading('Pruning data...');

    try {
      // Delete all clusters - this will cascade to all related data
      const { error: clusterError } = await supabase
        .from('clusters')
        .delete()
        .not('id', 'is', null); // More reliable way to match all rows

      if (clusterError) throw clusterError;

      toast.success('All data has been successfully deleted', { id: toastId });
      setPruneModal({
        isOpen: false,
        confirmText: '',
        acknowledged: false,
        inProgress: false
      });
    } catch (err: any) {
      console.error('Error pruning data:', err);
      toast.error('Failed to prune data: ' + err.message, { id: toastId });
    } finally {
      setPruneModal(prev => ({ ...prev, inProgress: false }));
    }
  };

  const PreviewModal = () => {
    if (!showPreview || !previewData) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Preview Import Data</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Clusters */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Clusters ({previewData.clusters.length})
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {previewData.clusters.map((cluster, i) => (
                  <div key={i} className="border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                    <div className="font-medium">{cluster.name}</div>
                    {cluster.description && (
                      <div className="text-sm text-gray-500">{cluster.description}</div>
                    )}
                    
                    {/* Pathways */}
                    <div className="ml-4 mt-2">
                      <div className="text-sm font-medium text-gray-600">
                        Pathways ({cluster.pathways.length})
                      </div>
                      {cluster.pathways.map((pathway, j) => (
                        <div key={j} className="ml-2 mt-1">
                          <div className="text-sm">{pathway.name}</div>
                          
                          {/* Interventions */}
                          <div className="ml-4 mt-1">
                            <div className="text-xs text-gray-600">
                              Interventions ({pathway.interventions.length})
                            </div>
                            {pathway.interventions.map((intervention, k) => (
                              <div key={k} className="ml-2 mt-1 text-xs">
                                <div>{intervention.name}</div>
                                <div className="ml-4 text-gray-500">
                                  Actions: {intervention.actions.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PruneDataModal = () => {
    if (!pruneModal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-medium">Prune All Data</h3>
            </div>
            <button
              onClick={() => setPruneModal(prev => ({ ...prev, isOpen: false }))}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">Warning: This action cannot be undone!</h4>
              <p className="text-sm text-red-700">
                This will permanently delete ALL data from the system, including:
              </p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                <li>All clusters and their attributes</li>
                <li>All pathways and their attributes</li>
                <li>All interventions and their attributes</li>
                <li>All actions and their attributes</li>
                <li>All related metadata and relationships</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type "CONFIRM DELETE" to proceed
                </label>
                <input
                  type="text"
                  value={pruneModal.confirmText}
                  onChange={(e) => setPruneModal(prev => ({ ...prev, confirmText: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  placeholder="CONFIRM DELETE"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={pruneModal.acknowledged}
                  onChange={(e) => setPruneModal(prev => ({ ...prev, acknowledged: e.target.checked }))}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="acknowledge" className="ml-2 block text-sm text-gray-900">
                  I understand that this action will permanently delete all data and cannot be undone
                </label>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end space-x-3">
              <button
                onClick={() => setPruneModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={pruneModal.inProgress}
              >
                Cancel
              </button>
              <button
                onClick={handlePruneData}
                disabled={
                  pruneModal.inProgress ||
                  pruneModal.confirmText !== 'CONFIRM DELETE' ||
                  !pruneModal.acknowledged
                }
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {pruneModal.inProgress ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete All Data'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Import</h2>
          <p className="mt-1 text-sm text-gray-500">
            Import existing data in Excel format or reset the system database.
          </p>
        </div>
        <button
          onClick={() => setPruneModal(prev => ({ ...prev, isOpen: true }))}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Prune Data
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="space-y-6">
          {/* Template Download */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Template</h3>
            <p className="text-sm text-gray-500 mb-4">
              Download the template file to see the required format for data import.
            </p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Import Data</h3>
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      className="sr-only"
                      onChange={handleFileUpload}
                      disabled={importing}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
              </div>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <div className="text-sm text-red-700">{validationError}</div>
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-sm text-gray-600">Importing data...</span>
            </div>
          )}

          {/* Import Stats */}
          {importStats && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <div className="text-sm text-green-700">
                  <p>Import completed successfully:</p>
                  <ul className="mt-2 list-disc list-inside">
                    <li>{importStats.clusters} clusters imported</li>
                    <li>{importStats.pathways} pathways imported</li>
                    <li>{importStats.interventions} interventions imported</li>
                    <li>{importStats.actions} actions imported</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal />

      {/* Prune Data Modal */}
      <PruneDataModal />
    </div>
  );
}