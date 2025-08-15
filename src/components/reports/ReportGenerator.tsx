import React, { useState, useEffect } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  Image,
} from '@react-pdf/renderer';
import type { ReportTemplate } from '../../types/reports';
import { format as formatDate } from 'date-fns';
import { useCreateGeneratedReport } from '../../hooks/useGeneratedReportQueries';

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
});

interface Props {
  template: ReportTemplate;
  data: any;
  interventionId: string;
  onSave?: () => void;
}

export function ReportGenerator({ template, data, interventionId, onSave }: Props) {
  const [chartImages, setChartImages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createReport = useCreateGeneratedReport();

  useEffect(() => {
    generateChartImages();
  }, [template, data]);

  const generateChartImages = async () => {
    // Chart generation logic here
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await createReport.mutateAsync({
        template_id: template.id,
        intervention_id: interventionId,
        data,
      });

      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      console.error('Error saving report:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTableValue = (value: any, fmt?: string) => {
    if (value == null) return '';

    switch (fmt) {
      case 'date':
        return value instanceof Date ? formatDate(value, 'PPP') : value;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'currency':
        return typeof value === 'number'
          ? new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value)
          : value;
      default:
        return String(value);
    }
  };

  const renderElement = (element: any, elementIndex: number) => {
    switch (element.type) {
      case 'text':
        return (
          <Text
            key={`${element.id}-${elementIndex}`}
            style={{
              position: 'absolute',
              left: element.style.x,
              top: element.style.y,
              width: element.style.width,
              fontSize: element.style.fontSize || 12,
              color: element.style.color || '#000000',
            }}
          >
            {element.content}
          </Text>
        );

      case 'data':
        if (element.dataMapping) {
          const value = data[element.dataMapping.field];
          return (
            <Text
              key={`${element.id}-${elementIndex}`}
              style={{
                position: 'absolute',
                left: element.style.x,
                top: element.style.y,
                width: element.style.width,
                fontSize: element.style.fontSize || 12,
              }}
            >
              {value instanceof Date ? formatDate(value, 'PPP') : String(value)}
            </Text>
          );
        }
        return null;

      case 'table':
        if (element.tableConfig) {
          return (
            <View
              key={`${element.id}-${elementIndex}`}
              style={{
                position: 'absolute',
                left: element.style.x,
                top: element.style.y,
                width: element.style.width,
              }}
            >
              <View style={{ display: 'table', width: '100%', borderCollapse: 'collapse' } as any}>
                {/* Table Header */}
                <View style={{ display: 'table-row', backgroundColor: '#f3f4f6' } as any}>
                  {element.tableConfig.dataSource.columns.map((column: any, colIndex: number) => (
                    <View
                      key={`${element.id}-header-${colIndex}`}
                      style={{
                        display: 'table-cell',
                        padding: 8,
                        borderBottom: '1px solid #e5e7eb',
                        width: column.width,
                        textAlign: column.align || 'left',
                      } as any}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>
                        {column.header}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Table Body */}
                {Array.isArray(data[element.tableConfig.dataSource.table]) &&
                  data[element.tableConfig.dataSource.table].map((row: any, rowIndex: number) => (
                    <View
                      key={`${element.id}-row-${rowIndex}`}
                      style={{
                        display: 'table-row',
                        backgroundColor:
                          element.tableConfig.style?.striped && rowIndex % 2 === 1
                            ? '#f9fafb'
                            : '#ffffff',
                      } as any}
                    >
                      {element.tableConfig.dataSource.columns.map((column: any, colIndex: number) => (
                        <View
                          key={`${element.id}-cell-${rowIndex}-${colIndex}`}
                          style={{
                            display: 'table-cell',
                            padding: 8,
                            borderBottom: '1px solid #e5e7eb',
                            width: column.width,
                            textAlign: column.align || 'left',
                          } as any}
                        >
                          <Text style={{ fontSize: 12 }}>
                            {formatTableValue(row[column.field], column.format)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
              </View>
            </View>
          );
        }
        return null;

      case 'chart':
        if (chartImages[element.id]) {
          return (
            <Image
              key={`${element.id}-${elementIndex}`}
              src={chartImages[element.id]}
              style={{
                position: 'absolute',
                left: element.style.x,
                top: element.style.y,
                width: element.style.width,
                height: element.style.height,
              }}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
        <PDFViewer style={{ width: '100%', height: '100%' }}>
          <Document>
            <Page size="A4" style={styles.page}>
              {template.layout.sections.map((section, sectionIndex) => (
                <View key={`section-${sectionIndex}`} style={styles.section}>
                  {section.elements.map((element, elementIndex) =>
                    renderElement(element, elementIndex)
                  )}
                </View>
              ))}
            </Page>
          </Document>
        </PDFViewer>
      </div>

      <div className="flex justify-end space-x-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Report'}
        </button>
      </div>
    </div>
  );
}