import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  X,
  Database,
  Globe,
  Boxes,
  FileSpreadsheet,
  FileText,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Play,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { parseCsv } from '../../../utils/parsers/csvParser';
import { parseSqlDdl } from '../../../utils/parsers/sqlDdlParser';
import {
  inferParquetSchema,
  inferApiSchema,
  executeZetarisFederatedQuery,
  sanitizeIdentifier,
  DATABASE_CATALOG_PRESETS,
  ZETARIS_VIRTUAL_CATALOG,
  type ZetarisQueryResult,
} from '../services/sourceCatalog';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { genId } from '../../../utils/graph';
import type { Column, PipelineNode, SourceFormat } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';

export type ImportModalTab = 'files' | 'databases' | 'api' | 'zetaris';

export interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ImportModalTab;
  onImportSuccess?: (resource: {
    id: string;
    name: string;
    columns: Column[];
    format: SourceFormat;
    fileName?: string;
  }) => void;
}

export function ImportDataModal({
  isOpen,
  onClose,
  initialTab = 'files',
  onImportSuccess,
}: ImportDataModalProps) {
  const [activeTab, setActiveTab] = useState<ImportModalTab>(initialTab);
  const addNode = usePipelineStore((s) => s.addNode);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // -------------------------------------------------------------
  // TAB 1: FILES (CSV / Parquet / JSON / SQL)
  // -------------------------------------------------------------
  const [fileFormat, setFileFormat] = useState<'parquet' | 'csv' | 'sql'>('parquet');
  const [fileTableName, setFileTableName] = useState('sales_transactions');
  const [fileCloudUri, setFileCloudUri] = useState('s3://lakehouse-aurabi/raw/sales_transactions.parquet');
  const [fileColumns, setFileColumns] = useState<Column[]>([
    { name: 'transaction_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
    { name: 'customer_id', type: 'INT', isPrimaryKey: false, isForeignKey: false },
    { name: 'amount', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
    { name: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false },
    { name: 'payment_status', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false },
    { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
  ]);
  const [parquetMeta, setParquetMeta] = useState({
    rowCount: 124500,
    rowGroups: 4,
    codec: 'SNAPPY',
    sizeBytes: '14.8 MB',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = sanitizeIdentifier(file.name.replace(/\.[^/.]+$/, ''));
    setFileTableName(baseName);

    if (file.name.endsWith('.parquet')) {
      setFileFormat('parquet');
      const meta = inferParquetSchema(file.name);
      setFileColumns(meta.columns);
      setParquetMeta({
        rowCount: meta.rowCount,
        rowGroups: meta.rowGroups,
        codec: meta.codec,
        sizeBytes: `${(meta.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      });
    } else if (file.name.endsWith('.sql')) {
      setFileFormat('sql');
      const text = await file.text();
      const parsed = parseSqlDdl(text);
      if (parsed.tables.length > 0) {
        setFileTableName(parsed.tables[0].name);
        setFileColumns(parsed.tables[0].columns);
      }
    } else {
      // CSV or TXT
      setFileFormat('csv');
      const text = await file.text();
      const parsed = parseCsv(text, { tableName: baseName });
      if (parsed.columns.length > 0) {
        setFileColumns(parsed.columns);
      }
    }
  };

  const loadSampleFile = (type: 'parquet_sales' | 'csv_churn' | 'parquet_events') => {
    if (type === 'parquet_sales') {
      setFileFormat('parquet');
      setFileTableName('sales_transactions');
      setFileCloudUri('s3://lakehouse-aurabi/raw/sales_transactions.parquet');
      const meta = inferParquetSchema('sales_transactions.parquet');
      setFileColumns(meta.columns);
      setParquetMeta({
        rowCount: meta.rowCount,
        rowGroups: meta.rowGroups,
        codec: meta.codec,
        sizeBytes: `${(meta.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      });
    } else if (type === 'parquet_events') {
      setFileFormat('parquet');
      setFileTableName('clickstream_events');
      setFileCloudUri('s3://lakehouse-aurabi/events/clickstream_events.parquet');
      const meta = inferParquetSchema('clickstream_events.parquet');
      setFileColumns(meta.columns);
      setParquetMeta({
        rowCount: meta.rowCount,
        rowGroups: meta.rowGroups,
        codec: meta.codec,
        sizeBytes: `${(meta.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
      });
    } else {
      setFileFormat('csv');
      setFileTableName('customer_churn');
      setFileCloudUri('https://data.aurabi.internal/datasets/customer_churn.csv');
      setFileColumns([
        { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'tenure_months', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'contract_type', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
        { name: 'monthly_charges', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'churn_risk_score', type: 'DECIMAL(4,2)', isPrimaryKey: false, isForeignKey: false },
      ]);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: DATABASES (PostgreSQL / MySQL / Snowflake)
  // -------------------------------------------------------------
  const [dbEngine, setDbEngine] = useState<'postgresql' | 'mysql' | 'snowflake'>('postgresql');
  const [dbHost, setDbHost] = useState('postgres-prod.internal');
  const [dbPort, setDbPort] = useState(5432);
  const [dbName, setDbName] = useState('aurabi_production');
  const [dbSchema, setDbSchema] = useState('public');
  const [dbUser, setDbUser] = useState('lakehouse_agent');
  const [dbPassword, setDbPassword] = useState('••••••••••••');
  const [dbSnowflakeWarehouse, setDbSnowflakeWarehouse] = useState('COMPUTE_WH');
  const [dbSnowflakeRole, setDbSnowflakeRole] = useState('ANALYST');
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
    serverVersion?: string;
  } | null>(null);
  const [selectedDbTable, setSelectedDbTable] = useState('customers');

  const handleTestDatabase = () => {
    setDbTesting(true);
    setDbTestResult(null);
    setTimeout(() => {
      setDbTesting(false);
      setDbTestResult({
        ok: true,
        latencyMs: 14,
        message: 'SSL TLS 1.3 Handshake verified. Connection established successfully.',
        serverVersion:
          dbEngine === 'postgresql'
            ? 'PostgreSQL 16.2 (Debian 16.2-1.pgdg120+1)'
            : dbEngine === 'snowflake'
            ? 'Snowflake Virtual Lakehouse 8.14.0'
            : 'MySQL Enterprise 8.3.0',
      });
    }, 700);
  };

  const loadDbPreset = (engine: 'postgresql' | 'mysql' | 'snowflake') => {
    setDbEngine(engine);
    setDbTestResult(null);
    if (engine === 'postgresql') {
      setDbHost('postgres-prod.internal');
      setDbPort(5432);
      setDbName('production');
      setDbSchema('public');
      setSelectedDbTable('customers');
    } else if (engine === 'snowflake') {
      setDbHost('aura_enterprise.us-east-1.snowflakecomputing.com');
      setDbPort(443);
      setDbName('ANALYTICS');
      setDbSchema('CRM');
      setDbSnowflakeWarehouse('COMPUTE_WH');
      setDbSnowflakeRole('ACCOUNTADMIN');
      setSelectedDbTable('dim_enterprise_accounts');
    } else {
      setDbHost('mysql-storefront.internal');
      setDbPort(3306);
      setDbName('ecommerce_store');
      setDbSchema('storefront');
      setSelectedDbTable('store_inventory');
    }
  };

  // -------------------------------------------------------------
  // TAB 3: WEB APIS (REST / Webhooks)
  // -------------------------------------------------------------
  const [apiUrl, setApiUrl] = useState('https://api.stripe.com/v1/charges');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiAuthType, setApiAuthType] = useState<'none' | 'bearer' | 'apiKey'>('bearer');
  const [apiToken, setApiToken] = useState('sk_live_51M0...938f');
  const [apiJsonPath, setApiJsonPath] = useState('$.data[*]');
  const [apiInferring, setApiInferring] = useState(false);
  const [apiInferredColumns, setApiInferredColumns] = useState<Column[]>([
    { name: 'charge_id', type: 'VARCHAR(64)', isPrimaryKey: true, isForeignKey: false },
    { name: 'customer_id', type: 'VARCHAR(64)', isPrimaryKey: false, isForeignKey: false },
    { name: 'amount', type: 'INT', isPrimaryKey: false, isForeignKey: false, description: 'Amount in cents' },
    { name: 'currency', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false },
    { name: 'status', type: 'VARCHAR(24)', isPrimaryKey: false, isForeignKey: false },
    { name: 'paid', type: 'BOOLEAN', isPrimaryKey: false, isForeignKey: false },
    { name: 'created', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
  ]);
  const [apiPayloadPreview, setApiPayloadPreview] = useState<string>(
    JSON.stringify(
      {
        object: 'list',
        data: [
          {
            charge_id: 'ch_3N4yAb2eZvKYlo2C1',
            amount: 4900,
            currency: 'usd',
            customer_id: 'cus_1048',
            paid: true,
            status: 'succeeded',
            created: '2026-10-24T04:12:00Z',
          },
        ],
      },
      null,
      2
    )
  );

  const handleTestApi = () => {
    setApiInferring(true);
    setTimeout(() => {
      setApiInferring(false);
      const res = inferApiSchema(apiUrl, apiPayloadPreview);
      setApiInferredColumns(res.columns);
    }, 600);
  };

  const loadApiPreset = (preset: 'stripe' | 'salesforce' | 'shopify') => {
    if (preset === 'stripe') {
      setApiUrl('https://api.stripe.com/v1/charges');
      setApiAuthType('bearer');
      setApiToken('sk_live_51M0...938f');
      setApiJsonPath('$.data[*]');
      const res = inferApiSchema('https://api.stripe.com/v1/charges');
      setApiInferredColumns(res.columns);
    } else if (preset === 'salesforce') {
      setApiUrl('https://aura-prod.my.salesforce.com/services/data/v60.0/sobjects/Lead');
      setApiAuthType('bearer');
      setApiToken('00D5e000000...OAuthToken');
      setApiJsonPath('$.records[*]');
      setApiInferredColumns([
        { name: 'lead_id', type: 'VARCHAR(18)', isPrimaryKey: true, isForeignKey: false },
        { name: 'company', type: 'VARCHAR(128)', isPrimaryKey: false, isForeignKey: false },
        { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'annual_revenue', type: 'DECIMAL(14,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(40)', isPrimaryKey: false, isForeignKey: false },
      ]);
    } else {
      setApiUrl('https://store.myshopify.com/admin/api/2026-01/orders.json');
      setApiAuthType('apiKey');
      setApiJsonPath('$.orders[*]');
      setApiInferredColumns([
        { name: 'order_id', type: 'BIGINT', isPrimaryKey: true, isForeignKey: false },
        { name: 'total_price', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'customer_email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'financial_status', type: 'VARCHAR(32)', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ]);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: ZETARIS UNIFIED VIRTUALIZATION LAYER
  // -------------------------------------------------------------
  const [zetarisSql, setZetarisSql] = useState(`-- Query heterogeneous sources via Zetaris Single Access Point
-- Combines PostgreSQL (Live DB) + Parquet (S3 File) + Stripe (REST API)
SELECT 
  c.full_name AS customer_name,
  c.email,
  c.loyalty_tier,
  p.amount AS total_spend,
  api.status AS charge_status
FROM zetaris.postgres.customers c
JOIN zetaris.files.sales_parquet p 
  ON c.customer_id = p.customer_id
LEFT JOIN zetaris.api.stripe_charges api 
  ON c.customer_id = api.customer_id
WHERE p.amount > 100.00
ORDER BY p.amount DESC
LIMIT 5;`);

  const [zetarisExecuting, setZetarisExecuting] = useState(false);
  const [zetarisResult, setZetarisResult] = useState<ZetarisQueryResult | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const handleRunZetarisQuery = () => {
    setZetarisExecuting(true);
    setTimeout(() => {
      setZetarisExecuting(false);
      const res = executeZetarisFederatedQuery(zetarisSql);
      setZetarisResult(res);
    }, 400);
  };

  const copyZetarisEndpoint = async () => {
    await navigator.clipboard.writeText('jdbc:zetaris://lakehouse.aurabi.internal:5432/zetaris_unified');
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 1800);
  };

  // -------------------------------------------------------------
  // COMMON IMPORT HANDLER
  // -------------------------------------------------------------
  const handleCompleteImport = () => {
    let name = 'imported_resource';
    let format: SourceFormat = 'generic';
    let columns: Column[] = [];
    let fileName = '';

    if (activeTab === 'files') {
      name = fileTableName;
      format = fileFormat === 'parquet' ? 'parquet' : fileFormat === 'sql' ? 'postgresql' : 'csv';
      columns = fileColumns;
      fileName = fileFormat === 'parquet' ? `${fileTableName}.parquet` : `${fileTableName}.${fileFormat}`;
    } else if (activeTab === 'databases') {
      name = selectedDbTable;
      format = dbEngine;
      const presetTables = DATABASE_CATALOG_PRESETS[dbEngine] || [];
      const found = presetTables.find((t) => t.tableName === selectedDbTable);
      columns = found ? found.columns : [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
      ];
      fileName = `${dbEngine}://${dbHost}/${dbName}.${selectedDbTable}`;
    } else if (activeTab === 'api') {
      name = sanitizeIdentifier(apiUrl.split('?')[0].split('/').filter(Boolean).pop() || 'rest_api');
      format = 'api';
      columns = apiInferredColumns;
      fileName = apiUrl;
    } else {
      // Zetaris Unified
      name = 'zetaris_lakehouse_unified';
      format = 'snowflake'; // analytical mart role
      columns = [
        { name: 'customer_id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'customer_name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        { name: 'total_spend', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'charge_status', type: 'VARCHAR(24)', isPrimaryKey: false, isForeignKey: false },
      ];
      fileName = 'jdbc:zetaris://lakehouse.aurabi.internal:5432/zetaris_unified';
    }

    const newId = genId('src');

    // Add node to pipeline store
    const node: PipelineNode = {
      id: newId,
      type: 'resource',
      position: { x: 80 + Math.random() * 100, y: 120 + Math.random() * 120 },
      data: {
        category: 'resource',
        kind: format === 'csv' || format === 'parquet' ? 'external' : 'source',
        label: name,
        description: `Imported via AuraBI Data Virtualizer (${format.toUpperCase()}). Linked to unified Zetaris SQL access point.`,
        warehouseRole: 'source',
        format,
        columns,
      },
    };
    addNode(node);

    // Trigger parent callback if provided (e.g. for prompt attachment)
    if (onImportSuccess) {
      onImportSuccess({
        id: newId,
        name,
        columns,
        format,
        fileName,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1E2D24]/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Import Data Sources and Zetaris Virtualization Layer"
      onClick={onClose}
    >
      <div
        className="bg-[#FDFFFC] rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-[#334139]/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#334139]/10 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#064C1C]/10 text-[#064C1C] flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#334139]">Import & Link Data Sources</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#064C1C] text-[#FDFFFC] font-semibold">
                  Zetaris Virtualizer
                </span>
              </div>
              <p className="text-xs text-[#334139]/75">
                Link databases, files (CSV, Parquet), and web APIs into a single queryable SQL access point.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Navigation Pills */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[#334139]/10 bg-slate-50/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('files')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
              activeTab === 'files'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-xs'
                : 'bg-transparent text-[#334139] hover:bg-[#064C1C]/10 border border-[#334139]/20'
            )}
          >
            <Boxes size={14} />
            <span>Files (CSV, Parquet)</span>
          </button>

          <button
            onClick={() => setActiveTab('databases')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
              activeTab === 'databases'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-xs'
                : 'bg-transparent text-[#334139] hover:bg-[#064C1C]/10 border border-[#334139]/20'
            )}
          >
            <Database size={14} />
            <span>Databases (Live SQL)</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
              activeTab === 'api'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-xs'
                : 'bg-transparent text-[#334139] hover:bg-[#064C1C]/10 border border-[#334139]/20'
            )}
          >
            <Globe size={14} />
            <span>Web APIs (REST)</span>
          </button>

          <button
            onClick={() => setActiveTab('zetaris')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs',
              activeTab === 'zetaris'
                ? 'bg-[#064C1C] text-[#FDFFFC] shadow-xs'
                : 'bg-transparent text-[#334139] hover:bg-[#064C1C]/10 border border-[#334139]/20'
            )}
          >
            <Layers size={14} />
            <span>Zetaris Virtual Layer</span>
            <span
              className={cn(
                'text-[9px] px-1.5 py-0.2 rounded-full font-mono',
                activeTab === 'zetaris' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              )}
            >
              Unified
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FILES */}
          {activeTab === 'files' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#334139]">File Format:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFileFormat('parquet')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        fileFormat === 'parquet'
                          ? 'bg-[#D66F14] text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      Parquet (.parquet)
                    </button>
                    <button
                      onClick={() => setFileFormat('csv')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        fileFormat === 'csv'
                          ? 'bg-[#064C1C] text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      CSV (.csv)
                    </button>
                    <button
                      onClick={() => setFileFormat('sql')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        fileFormat === 'sql'
                          ? 'bg-[#334139] text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      SQL DDL
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#334139]/70 font-medium">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => loadSampleFile('parquet_sales')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-[#D66F14] text-[#334139] cursor-pointer"
                  >
                    sales.parquet
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleFile('parquet_events')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-[#D66F14] text-[#334139] cursor-pointer"
                  >
                    events.parquet
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSampleFile('csv_churn')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-[#064C1C] text-[#334139] cursor-pointer"
                  >
                    churn.csv
                  </button>
                </div>
              </div>

              {/* Upload Zone & Cloud S3 Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drag / Select File */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#334139]/20 hover:border-[#064C1C] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-50/60 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".parquet,.csv,.sql,.json,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-10 h-10 rounded-full bg-[#064C1C]/10 text-[#064C1C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    {fileFormat === 'parquet' ? <Boxes size={20} /> : <FileSpreadsheet size={20} />}
                  </div>
                  <div className="text-xs font-bold text-[#334139]">
                    Click or drop {fileFormat === 'parquet' ? 'Parquet' : 'CSV/DDL'} file
                  </div>
                  <div className="text-[10px] text-[#334139]/60 mt-1">
                    Accepts .parquet, .csv, .sql (Parsed locally in browser)
                  </div>
                </div>

                {/* Cloud Object Storage URI */}
                <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-white">
                  <div>
                    <label className="text-xs font-bold text-[#334139] flex items-center gap-1.5 mb-1.5">
                      <Cloud size={14} className="text-[#D66F14]" />
                      Cloud Storage / Lakehouse URI
                    </label>
                    <input
                      type="text"
                      value={fileCloudUri}
                      onChange={(e) => setFileCloudUri(e.target.value)}
                      placeholder="s3://lakehouse/data/orders.parquet"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#064C1C]"
                    />
                    <p className="text-[10px] text-[#334139]/60 mt-1">
                      Direct cloud access through Zetaris S3/GCS Zero-Copy pushdown.
                    </p>
                  </div>

                  {fileFormat === 'parquet' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-[#334139]/80">
                      <span>Codec: <strong className="text-[#D66F14]">{parquetMeta.codec}</strong></span>
                      <span>Row Groups: <strong>{parquetMeta.rowGroups}</strong></span>
                      <span>Rows: <strong>{parquetMeta.rowCount.toLocaleString()}</strong></span>
                      <span>Size: <strong>{parquetMeta.sizeBytes}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Table Name & Inferred Schema Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#334139]">Virtual Table Name:</span>
                    <input
                      type="text"
                      value={fileTableName}
                      onChange={(e) => setFileTableName(sanitizeIdentifier(e.target.value))}
                      className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[#334139]"
                    />
                  </div>
                  <span className="text-[11px] text-[#334139]/70 font-mono">
                    {fileColumns.length} columns detected
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[#334139]/80 font-mono text-[11px]">
                      <tr>
                        <th className="px-4 py-2">Column Name</th>
                        <th className="px-4 py-2">Data Type</th>
                        <th className="px-4 py-2">Primary Key</th>
                        <th className="px-4 py-2">Nullable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {fileColumns.map((col, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="px-4 py-1.5 font-bold text-[#334139]">{col.name}</td>
                          <td className="px-4 py-1.5 text-blue-700">{col.type}</td>
                          <td className="px-4 py-1.5">
                            {col.isPrimaryKey ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                PK
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-1.5 text-slate-500">
                            {col.isPrimaryKey ? 'NO' : 'YES'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATABASES */}
          {activeTab === 'databases' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Engine Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#334139]">Live Engine:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => loadDbPreset('postgresql')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        dbEngine === 'postgresql'
                          ? 'bg-[#064C1C] text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <Database size={13} />
                      PostgreSQL
                    </button>
                    <button
                      onClick={() => loadDbPreset('snowflake')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        dbEngine === 'snowflake'
                          ? 'bg-cyan-700 text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <Cloud size={13} />
                      Snowflake
                    </button>
                    <button
                      onClick={() => loadDbPreset('mysql')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors',
                        dbEngine === 'mysql'
                          ? 'bg-[#D66F14] text-white'
                          : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <Database size={13} />
                      MySQL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-[#334139]/70">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Virtual direct pushdown enabled</span>
                </div>
              </div>

              {/* Connection Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-[#334139] mb-1 block">
                    Host / Account Domain
                  </label>
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">Port</label>
                  <input
                    type="number"
                    value={dbPort}
                    onChange={(e) => setDbPort(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">Database</label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">Schema</label>
                  <input
                    type="text"
                    value={dbSchema}
                    onChange={(e) => setDbSchema(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">Username</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                {dbEngine === 'snowflake' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-[#334139] mb-1 block">
                        Snowflake Warehouse
                      </label>
                      <input
                        type="text"
                        value={dbSnowflakeWarehouse}
                        onChange={(e) => setDbSnowflakeWarehouse(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#334139] mb-1 block">
                        Snowflake Role
                      </label>
                      <input
                        type="text"
                        value={dbSnowflakeRole}
                        onChange={(e) => setDbSnowflakeRole(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Test Connection Button & Status Banner */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestDatabase}
                    disabled={dbTesting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#334139] hover:bg-[#1E2D24] text-white transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {dbTesting ? <RefreshCw size={13} className="animate-spin" /> : <Server size={13} />}
                    <span>{dbTesting ? 'Pinging Host...' : 'Test Connection'}</span>
                  </button>

                  {dbTestResult && (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>{dbTestResult.serverVersion} ({dbTestResult.latencyMs}ms)</span>
                    </div>
                  )}
                </div>

                {/* Available Tables in Database */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#334139]">
                      Available Tables in {dbEngine.toUpperCase()} Catalog:
                    </span>
                    <span className="text-[11px] font-mono text-[#334139]/70">
                      Select table to virtualize
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(DATABASE_CATALOG_PRESETS[dbEngine] || []).map((t) => (
                      <button
                        key={t.tableName}
                        onClick={() => setSelectedDbTable(t.tableName)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer',
                          selectedDbTable === t.tableName
                            ? 'bg-[#064C1C] text-white shadow-xs font-bold'
                            : 'bg-white text-[#334139] border border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        <Database size={12} />
                        <span>{t.tableName}</span>
                        <span className="text-[10px] opacity-75">
                          ({t.rowCount.toLocaleString()} rows)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEB APIS */}
          {activeTab === 'api' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Presets Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#334139]">Sample Web APIs:</span>
                  <button
                    onClick={() => loadApiPreset('stripe')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-sky-500 text-[#334139] cursor-pointer"
                  >
                    Stripe Charges
                  </button>
                  <button
                    onClick={() => loadApiPreset('salesforce')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-blue-500 text-[#334139] cursor-pointer"
                  >
                    Salesforce CRM
                  </button>
                  <button
                    onClick={() => loadApiPreset('shopify')}
                    className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-slate-200 hover:border-emerald-500 text-[#334139] cursor-pointer"
                  >
                    Shopify Orders
                  </button>
                </div>

                <span className="text-[11px] text-[#334139]/70 font-mono">
                  Live JSON → SQL Schema Inferrer
                </span>
              </div>

              {/* Endpoint URL & Method */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">HTTP Method</label>
                  <select
                    value={apiMethod}
                    onChange={(e) => setApiMethod(e.target.value as 'GET' | 'POST')}
                    className="w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-[#334139] mb-1 block">Endpoint URL</label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Auth & JSON Path */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">
                    Authentication Type
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={apiAuthType}
                      onChange={(e) => setApiAuthType(e.target.value as 'none' | 'bearer' | 'apiKey')}
                      className="text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="bearer">Bearer Token</option>
                      <option value="apiKey">API Key Header</option>
                      <option value="none">Public / No Auth</option>
                    </select>
                    {apiAuthType !== 'none' && (
                      <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Auth Token"
                        className="flex-1 text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#334139] mb-1 block">
                    JSON Path / Root Record Path
                  </label>
                  <input
                    type="text"
                    value={apiJsonPath}
                    onChange={(e) => setApiJsonPath(e.target.value)}
                    placeholder="$.data[*] or $.items"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Infer Schema Trigger */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestApi}
                  disabled={apiInferring}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#334139] hover:bg-[#1E2D24] text-white transition-all cursor-pointer shadow-2xs"
                >
                  {apiInferring ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>{apiInferring ? 'Querying Endpoint...' : 'Fetch & Infer SQL Schema'}</span>
                </button>
                <span className="text-[11px] text-[#334139]/70 font-mono">
                  {apiInferredColumns.length} fields mapped to SQL columns
                </span>
              </div>

              {/* Inferred Column Schema Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[#334139]/80 font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-2">Virtual Column Name</th>
                      <th className="px-4 py-2">Inferred SQL Type</th>
                      <th className="px-4 py-2">Key</th>
                      <th className="px-4 py-2">Sample / Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {apiInferredColumns.map((col, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="px-4 py-1.5 font-bold text-[#334139]">{col.name}</td>
                        <td className="px-4 py-1.5 text-blue-700">{col.type}</td>
                        <td className="px-4 py-1.5">
                          {col.isPrimaryKey ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              PK
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 text-slate-500 truncate max-w-[200px]">
                          {col.description || 'Virtual REST field'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ZETARIS UNIFIED VIRTUALIZATION LAYER */}
          {activeTab === 'zetaris' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Architecture & Single Access Point Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1E2D24] to-[#064C1C] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D66F14] text-white font-bold">
                      Single Access Point
                    </span>
                    <span className="text-xs text-emerald-200 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Lakehouse Gateway Online
                    </span>
                  </div>
                  <h4 className="text-sm font-bold tracking-tight">
                    Zetaris Unified SQL Virtualization Layer
                  </h4>
                  <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                    Exposes files (Parquet, CSV), live databases (PostgreSQL, Snowflake), and REST APIs through a single SQL access point so agents query them without separate connectors.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={copyZetarisEndpoint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors cursor-pointer border border-white/20"
                  >
                    {copiedEndpoint ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                    <span>{copiedEndpoint ? 'Endpoint Copied' : 'Copy JDBC URL'}</span>
                  </button>
                  <span className="text-[10px] font-mono text-white/60">
                    jdbc:zetaris://lakehouse.aurabi.internal:5432
                  </span>
                </div>
              </div>

              {/* Federated Virtual Catalogs Explorer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#334139]">
                    Virtual Schemas Mapped into Zetaris Single Access Point:
                  </span>
                  <span className="text-[11px] font-mono text-[#334139]/70">
                    5 Heterogeneous Virtual Tables Ready
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ZETARIS_VIRTUAL_CATALOG.map((tbl) => (
                    <div
                      key={tbl.fullyQualifiedName}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-[#064C1C]/40 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-[#D66F14]">
                          {tbl.namespace}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {tbl.sourceFormat.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#334139] font-mono truncate">
                        {tbl.tableName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {tbl.rowCount.toLocaleString()} rows • {tbl.virtualizationMode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Cross-Source Federated SQL Sandbox */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#334139] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#D66F14]" />
                    Execute Cross-Source Virtual SQL (Zero Data Movement):
                  </label>
                  <button
                    type="button"
                    onClick={handleRunZetarisQuery}
                    disabled={zetarisExecuting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#064C1C] hover:bg-[#064C1C]/90 text-white transition-all cursor-pointer shadow-2xs"
                  >
                    {zetarisExecuting ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                    <span>{zetarisExecuting ? 'Pushing Down Query...' : 'Run Federated Query'}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    value={zetarisSql}
                    onChange={(e) => setZetarisSql(e.target.value)}
                    rows={6}
                    className="w-full bg-slate-900 text-emerald-400 font-mono text-[11px] p-3 rounded-2xl outline-none border border-slate-800 resize-none leading-relaxed"
                  />
                </div>

                {/* Query Result Table */}
                {zetarisResult && (
                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-emerald-900">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Execution Complete ({zetarisResult.executionTimeMs}ms)</span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-800">
                        Sources: {zetarisResult.federatedSourcesInvolved.length} federated engines
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-40 border border-emerald-200/80 rounded-xl bg-white">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-emerald-100/50 text-emerald-950 text-[10px] border-b border-emerald-200">
                          <tr>
                            {zetarisResult.columns.map((c) => (
                              <th key={c} className="px-3 py-1.5 capitalize">
                                {c.replace(/_/g, ' ')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px]">
                          {zetarisResult.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              {zetarisResult.columns.map((c) => (
                                <td key={c} className="px-3 py-1 text-slate-800">
                                  {String(row[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#334139]/10 bg-slate-50">
          <div className="text-xs text-[#334139]/70 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#064C1C]" />
            <span>
              Exposed through Zetaris single access point for AI Agents
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#334139] hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCompleteImport}
              style={{ backgroundColor: '#064C1C' }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold text-[#FDFFFC] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>
                {activeTab === 'zetaris'
                  ? 'Attach Zetaris Virtual Lakehouse'
                  : `Link & Attach ${activeTab === 'files' ? 'File' : activeTab === 'databases' ? 'Database' : 'REST API'}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

