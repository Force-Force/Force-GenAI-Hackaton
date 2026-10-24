import { useState } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  FileUp,
  AlertTriangle,
  Plus,
  Sparkles,
  Boxes,
  Globe,
  Cloud,
} from 'lucide-react';
import { Badge, Button, Panel } from '../../../components/ui';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { genId } from '../../../utils/graph';
import { parseCsv } from '../../../utils/parsers/csvParser';
import { parseSqlDdl } from '../../../utils/parsers/sqlDdlParser';
import { INITIAL_DATA_SOURCES } from '../../workspace/data/initialPipeline';
import type { Column, DataSource, PipelineNode, SourceFormat } from '../../../types/pipeline';
import { ImportDataModal, type ImportModalTab } from './ImportDataModal';
import { inferParquetSchema } from '../services/sourceCatalog';

type ImportFormat = 'csv' | 'sql' | 'parquet';

const EXTENDED_INITIAL_SOURCES: DataSource[] = [
  ...INITIAL_DATA_SOURCES,
  {
    id: 'parquet_sales_s3',
    name: 'Sales Transactions Parquet (S3)',
    type: 'parquet',
    status: 'connected',
    tableCount: 1,
    description: 'Columnar Parquet dataset with Snappy compression and partition pushdown.',
  },
  {
    id: 'stripe_rest_api',
    name: 'Stripe Billing Web API (REST)',
    type: 'api',
    status: 'connected',
    tableCount: 1,
    description: 'Real-time charges and invoices stream queryable via SQL.',
  },
];

export function DataSourceManager() {
  const [sources, setSources] = useState<DataSource[]>(EXTENDED_INITIAL_SOURCES);
  const [format, setFormat] = useState<ImportFormat>('parquet');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ImportModalTab>('files');

  const addNode = usePipelineStore((s) => s.addNode);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);

  const openModal = (tab: ImportModalTab = 'files') => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const toggle = (id: string) =>
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'connected' ? 'disconnected' : 'connected' }
          : s,
      ),
    );

  const addResource = (name: string, columns: Column[], kind: SourceFormat) => {
    const node: PipelineNode = {
      id: genId('src'),
      type: 'resource',
      position: { x: 60 + Math.random() * 120, y: 60 + Math.random() * 200 },
      data: {
        category: 'resource',
        kind: kind === 'csv' || kind === 'parquet' ? 'external' : 'source',
        label: name,
        description: `Imported via Zetaris Virtualizer (${kind.toUpperCase()}).`,
        warehouseRole: 'source',
        format: kind,
        columns,
      },
    };
    addNode(node);
  };

  const handleImport = () => {
    setErrors([]);
    setImported([]);

    if (format === 'parquet') {
      const meta = inferParquetSchema(text.trim() || 'sales_events.parquet');
      addResource(meta.tableName, meta.columns, 'parquet');
      setImported([
        `${meta.tableName} (${meta.columns.length} cols, ${meta.rowCount.toLocaleString()} rows, ${meta.codec})`,
      ]);
      setSources((prev) => [
        ...prev,
        {
          id: genId('ds_parquet'),
          name: meta.tableName,
          type: 'parquet',
          status: 'connected',
          tableCount: 1,
          description: `Parquet dataset with ${meta.columns.length} columns.`,
        },
      ]);
    } else if (format === 'csv') {
      const result = parseCsv(text, { tableName: 'imported_csv' });
      if (!result.ok) {
        setErrors(result.errors);
        if (result.columns.length === 0) return;
      }
      addResource(result.tableName, result.columns, 'csv');
      setImported([`${result.tableName} (${result.columns.length} cols, ${result.rowCount} rows)`]);
    } else {
      const result = parseSqlDdl(text);
      if (!result.ok && result.tables.length === 0) {
        setErrors(result.errors);
        return;
      }
      result.tables.forEach((t) => addResource(t.name, t.columns, 'postgresql'));
      setErrors(result.errors);
      setImported(result.tables.map((t) => `${t.name} (${t.columns.length} cols)`));
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.name.endsWith('.parquet')) {
      setFormat('parquet');
      setText(file.name);
    } else if (file.name.endsWith('.sql')) {
      const content = await file.text();
      setText(content);
      setFormat('sql');
    } else {
      const content = await file.text();
      setText(content);
      setFormat('csv');
    }
  };

  const handleModalImportSuccess = (res: {
    id: string;
    name: string;
    columns: Column[];
    format: SourceFormat;
  }) => {
    setSources((prev) => [
      ...prev,
      {
        id: res.id,
        name: res.name,
        type: res.format,
        status: 'connected',
        tableCount: 1,
        description: `Imported via Zetaris Virtualizer (${res.format.toUpperCase()}).`,
      },
    ]);
  };

  const renderSourceIcon = (type: SourceFormat) => {
    switch (type) {
      case 'parquet':
        return <Boxes size={16} className="text-[#D66F14]" />;
      case 'api':
        return <Globe size={16} className="text-sky-600" />;
      case 'snowflake':
        return <Cloud size={16} className="text-cyan-600" />;
      case 'postgresql':
      case 'mysql':
      default:
        return <Database size={16} className="text-[#064C1C]" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Top Banner: Zetaris Unified Lakehouse Virtualization Access Point */}
      <div className="p-5 rounded-2xl bg-[#1E2D24] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D66F14] text-white font-bold">
              Single Access Point
            </span>
            <span className="text-xs text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Zetaris Lakehouse Gateway Live
            </span>
          </div>
          <h2 className="text-base font-bold tracking-tight">
            Unified Virtualization Layer (Zetaris)
          </h2>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Link databases, files (CSV, Parquet), and web APIs into a single queryable endpoint.
            AI agents query all sources using standard ANSI SQL without requiring separate physical connectors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('zetaris')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#064C1C] hover:bg-[#064C1C]/90 text-white transition-all cursor-pointer shadow-xs"
          >
            <Sparkles size={13} className="text-amber-300" />
            <span>Virtual SQL Playground</span>
          </button>

          <button
            onClick={() => openModal('files')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#D66F14] hover:opacity-90 text-white transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Import Source</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: Connected Sources */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-sans font-bold text-[#334139]">
              Connected Virtual Sources ({sources.length})
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => openModal('databases')}
                className="text-[11px] font-semibold text-[#064C1C] hover:underline cursor-pointer px-1.5"
              >
                + Database
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => openModal('files')}
                className="text-[11px] font-semibold text-[#D66F14] hover:underline cursor-pointer px-1.5"
              >
                + Parquet/CSV
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => openModal('api')}
                className="text-[11px] font-semibold text-sky-600 hover:underline cursor-pointer px-1.5"
              >
                + REST API
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {sources.map((s) => (
              <Panel key={s.id} className="!rounded-xl border border-slate-200">
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700">
                      {renderSourceIcon(s.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#334139]">{s.name}</span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {s.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {s.tableCount} table{s.tableCount > 1 ? 's' : ''} • {s.description}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(s.id)}
                    className="cursor-pointer"
                    aria-label={`Toggle ${s.name}`}
                  >
                    {s.status === 'connected' ? (
                      <Badge tone="success">
                        <CheckCircle2 size={11} /> Virtualized
                      </Badge>
                    ) : (
                      <Badge tone="neutral">
                        <XCircle size={11} /> Disabled
                      </Badge>
                    )}
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        </div>

        {/* Right Column: Quick Parser & Importer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-sans font-bold text-[#334139]">Quick Schema Parser</h3>
            <button
              onClick={() => openModal('files')}
              className="text-xs font-bold text-[#064C1C] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles size={12} />
              Open Full Import Wizard →
            </button>
          </div>

          <Panel className="!rounded-xl p-4 gap-3 border border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                variant={format === 'parquet' ? 'primary' : 'secondary'}
                onClick={() => setFormat('parquet')}
              >
                Parquet
              </Button>
              <Button
                variant={format === 'csv' ? 'primary' : 'secondary'}
                onClick={() => setFormat('csv')}
              >
                CSV
              </Button>
              <Button
                variant={format === 'sql' ? 'primary' : 'secondary'}
                onClick={() => setFormat('sql')}
              >
                SQL DDL
              </Button>

              <label className="ml-auto">
                <input
                  type="file"
                  accept=".parquet,.csv,.sql,.txt"
                  className="hidden"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
                <span className="inline-flex items-center gap-1 text-[11px] text-[#064C1C] cursor-pointer hover:underline font-bold">
                  <FileUp size={13} /> Upload file
                </span>
              </label>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                format === 'parquet'
                  ? 's3://lakehouse/data/orders_2026.parquet\n-- or type table name: web_events.parquet'
                  : format === 'csv'
                  ? 'id,name,amount\n1,Acme,100.5'
                  : 'CREATE TABLE customers (\n  id INT PRIMARY KEY,\n  name VARCHAR(100)\n);'
              }
              aria-label="Schema import input"
              className="w-full h-36 bg-slate-900 text-cyan-300 font-mono text-[11px] p-3 rounded-xl outline-none resize-none border border-slate-800 leading-relaxed"
            />

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!text.trim()}
              className="!rounded-full font-bold"
            >
              Parse & Virtualize into Canvas
            </Button>

            {imported.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={12} className="text-emerald-600" /> Virtualized
                </div>
                {imported.map((i) => (
                  <div key={i} className="font-mono">
                    {i}
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab('canvas')}
                  className="mt-1.5 text-emerald-800 underline cursor-pointer font-bold"
                >
                  View on pipeline canvas →
                </button>
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} /> Parser Notices
                </div>
                {errors.map((e, i) => (
                  <div key={i} className="font-mono">
                    {e}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Global Data Source Import Modal */}
      <ImportDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTab={modalTab}
        onImportSuccess={handleModalImportSuccess}
      />
    </div>
  );
}
