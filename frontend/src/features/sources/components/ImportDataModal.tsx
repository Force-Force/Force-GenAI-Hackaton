import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { X, Boxes, Database, Globe, Layers, UploadCloud, FileText, Check } from 'lucide-react';
import { parseCsv } from '../../../utils/parsers/csvParser';
import { parseSqlDdl } from '../../../utils/parsers/sqlDdlParser';
import { inferApiSchema, sanitizeIdentifier } from '../services/sourceCatalog';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { genId } from '../../../utils/graph';
import type { Column, PipelineNode, SourceFormat } from '../../../types/pipeline';
import { cn } from '../../../utils/cn';

export type ImportModalTab = 'files' | 'databases' | 'api' | 'zetaris';

export interface ImportedResource {
  id: string;
  name: string;
  columns: Column[];
  format: SourceFormat;
  fileName?: string;
}

export interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ImportModalTab;
  onImportSuccess?: (resource: ImportedResource) => void;
}

const TABS: { id: ImportModalTab; label: string; Icon: typeof Boxes }[] = [
  { id: 'files', label: 'Files', Icon: Boxes },
  { id: 'databases', label: 'Databases', Icon: Database },
  { id: 'api', label: 'Web APIs', Icon: Globe },
  { id: 'zetaris', label: 'Zetaris layer', Icon: Layers },
];

const input =
  'w-full text-sm px-3.5 py-2.5 rounded-xl border border-[#334139]/20 bg-white text-[#334139] ' +
  'placeholder:text-[#334139]/35 outline-none focus:border-[#064C1C] focus:ring-2 focus:ring-[#064C1C]/10';

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-semibold text-[#334139]">{label}</span>
      {children}
    </label>
  );
}

function Pills<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer',
            value === o.id
              ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C] hover:bg-[#D66F14] hover:border-[#D66F14]'
              : 'bg-transparent text-[#334139] border-[#334139]/25 hover:bg-[#D66F14] hover:text-[#FDFFFC] hover:border-[#D66F14]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ImportDataModal({ isOpen, onClose, initialTab = 'files', onImportSuccess }: ImportDataModalProps) {
  const addNode = usePipelineStore((s) => s.addNode);
  const [tab, setTab] = useState<ImportModalTab>(initialTab);
  const [linked, setLinked] = useState<ImportedResource[]>([]);
  const [error, setError] = useState('');

  // Files
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; format: SourceFormat; columns: Column[]; table: string } | null>(null);

  // Databases
  const [engine, setEngine] = useState<'postgresql' | 'mysql' | 'snowflake'>('postgresql');
  const [db, setDb] = useState({ host: '', port: '', database: '', schema: '', user: '', password: '', warehouse: '' });

  // APIs
  const [api, setApi] = useState({ url: '', method: 'GET', auth: 'none', token: '', sample: '' });

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError('');
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const register = (res: Omit<ImportedResource, 'id'>) => {
    const id = genId('src');
    const node: PipelineNode = {
      id,
      type: 'resource',
      position: { x: 80 + Math.random() * 100, y: 120 + Math.random() * 120 },
      data: {
        category: 'resource',
        kind: res.format === 'csv' || res.format === 'parquet' ? 'external' : 'source',
        label: res.name,
        description: `Linked ${res.format.toUpperCase()} source${res.fileName ? ` (${res.fileName})` : ''}.`,
        warehouseRole: 'source',
        format: res.format,
        columns: res.columns,
      },
    };
    addNode(node);
    const full = { id, ...res };
    setLinked((prev) => [...prev, full]);
    onImportSuccess?.(full);
    onClose();
  };

  /* ---------------- Files ---------------- */
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    const lower = f.name.toLowerCase();
    const table = sanitizeIdentifier(f.name.replace(/\.[^/.]+$/, ''));
    try {
      if (lower.endsWith('.parquet')) {
        setFile({ name: f.name, format: 'parquet', columns: [], table });
      } else if (lower.endsWith('.sql')) {
        const parsed = parseSqlDdl(await f.text());
        if (parsed.tables.length === 0) throw new Error('No CREATE TABLE statements found.');
        setFile({ name: f.name, format: 'postgresql', columns: parsed.tables[0].columns, table: parsed.tables[0].name });
      } else if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
        const parsed = parseCsv(await f.text(), { tableName: table });
        if (parsed.columns.length === 0) throw new Error(parsed.errors[0] ?? 'Could not read a header row.');
        setFile({ name: f.name, format: 'csv', columns: parsed.columns, table: parsed.tableName });
      } else {
        throw new Error('Unsupported file type. Use CSV, Parquet or SQL DDL.');
      }
    } catch (e) {
      setFile(null);
      setError(e instanceof Error ? e.message : 'Failed to read file.');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files[0]);
  };

  /* ---------------- Submit ---------------- */
  const canSubmit =
    tab === 'files' ? !!file : tab === 'databases' ? !!(db.host && db.database) : tab === 'api' ? !!api.url : false;

  const submit = () => {
    setError('');
    if (tab === 'files' && file) {
      register({ name: file.table, format: file.format, columns: file.columns, fileName: file.name });
    } else if (tab === 'databases') {
      register({
        name: sanitizeIdentifier(db.database),
        format: engine,
        columns: [],
        fileName: `${engine}://${db.host}${db.port ? `:${db.port}` : ''}/${db.database}`,
      });
    } else if (tab === 'api') {
      let columns: Column[] = [];
      if (api.sample.trim()) {
        try {
          JSON.parse(api.sample);
        } catch {
          setError('The sample response is not valid JSON.');
          return;
        }
        columns = inferApiSchema(api.url, api.sample).columns;
      }
      const last = api.url.split('?')[0].split('/').filter(Boolean).pop() ?? 'rest_api';
      register({ name: sanitizeIdentifier(`api_${last}`), format: 'api', columns, fileName: api.url });
    }
  };

  const submitLabel = tab === 'files' ? 'Link file' : tab === 'databases' ? 'Link database' : 'Link API';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#334139]/30 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Import data sources"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-3xl bg-[#FDFFFC] border border-[#334139]/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-6 pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[#334139]">Add a data source</h3>
            <p className="text-xs text-[#334139]/60 mt-0.5">
              Everything is exposed to agents through a single SQL access point.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 -mr-2 rounded-full flex items-center justify-center text-[#334139]/60 hover:text-[#D66F14] hover:bg-[#D66F14]/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-7 border-b border-[#334139]/10">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setError('');
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px cursor-pointer transition-colors',
                tab === id
                  ? 'border-[#064C1C] text-[#064C1C]'
                  : 'border-transparent text-[#334139]/60 hover:text-[#D66F14]',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5 custom-scrollbar">
          {tab === 'files' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.parquet,.sql"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  void readFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-colors text-center',
                  dragging ? 'border-[#D66F14] bg-[#D66F14]/5' : 'border-[#334139]/25 hover:border-[#D66F14] hover:bg-[#D66F14]/5',
                )}
              >
                <UploadCloud size={26} className="text-[#334139]/70" />
                <div className="text-sm font-semibold text-[#334139]">Drop a file or click to browse</div>
                <div className="text-xs text-[#334139]/55">CSV, Parquet or SQL DDL</div>
              </div>

              {file && (
                <div className="rounded-2xl border border-[#334139]/15 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#334139]">
                    <FileText size={16} className="text-[#064C1C]" />
                    <span className="truncate">{file.name}</span>
                    <span className="ml-auto text-[10px] font-mono uppercase text-[#334139]/55">{file.format}</span>
                  </div>
                  <Field label="Table name">
                    <input
                      className={input}
                      value={file.table}
                      onChange={(e) => setFile({ ...file, table: sanitizeIdentifier(e.target.value) })}
                    />
                  </Field>
                  {file.columns.length > 0 ? (
                    <div className="text-xs text-[#334139]/70 font-mono leading-relaxed">
                      {file.columns.length} columns · {file.columns.map((c) => c.name).slice(0, 6).join(', ')}
                      {file.columns.length > 6 && '…'}
                    </div>
                  ) : (
                    <div className="text-xs text-[#334139]/55">Schema will be resolved by Zetaris once linked.</div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'databases' && (
            <>
              <Pills<'postgresql' | 'mysql' | 'snowflake'>
                value={engine}
                onChange={setEngine}
                options={[
                  { id: 'postgresql', label: 'PostgreSQL' },
                  { id: 'mysql', label: 'MySQL' },
                  { id: 'snowflake', label: 'Snowflake' },
                ]}
              />
              <div className="grid grid-cols-3 gap-3">
                <Field label={engine === 'snowflake' ? 'Account host' : 'Host'} className="col-span-2">
                  <input className={input} value={db.host} onChange={(e) => setDb({ ...db, host: e.target.value })} placeholder="db.example.com" />
                </Field>
                <Field label="Port">
                  <input className={input} value={db.port} onChange={(e) => setDb({ ...db, port: e.target.value })} placeholder={engine === 'mysql' ? '3306' : engine === 'snowflake' ? '443' : '5432'} />
                </Field>
                <Field label="Database">
                  <input className={input} value={db.database} onChange={(e) => setDb({ ...db, database: e.target.value })} />
                </Field>
                <Field label="Schema">
                  <input className={input} value={db.schema} onChange={(e) => setDb({ ...db, schema: e.target.value })} />
                </Field>
                {engine === 'snowflake' ? (
                  <Field label="Warehouse">
                    <input className={input} value={db.warehouse} onChange={(e) => setDb({ ...db, warehouse: e.target.value })} />
                  </Field>
                ) : (
                  <div />
                )}
                <Field label="Username" className="col-span-1">
                  <input className={input} value={db.user} onChange={(e) => setDb({ ...db, user: e.target.value })} autoComplete="off" />
                </Field>
                <Field label="Password" className="col-span-2">
                  <input type="password" className={input} value={db.password} onChange={(e) => setDb({ ...db, password: e.target.value })} autoComplete="new-password" />
                </Field>
              </div>
            </>
          )}

          {tab === 'api' && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Method">
                  <select className={input} value={api.method} onChange={(e) => setApi({ ...api, method: e.target.value })}>
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                </Field>
                <Field label="Endpoint URL" className="col-span-3">
                  <input className={input} value={api.url} onChange={(e) => setApi({ ...api, url: e.target.value })} placeholder="https://api.example.com/v1/orders" />
                </Field>
              </div>
              <Field label="Authentication">
                <Pills
                  value={api.auth}
                  onChange={(auth) => setApi({ ...api, auth })}
                  options={[
                    { id: 'none', label: 'None' },
                    { id: 'bearer', label: 'Bearer token' },
                    { id: 'apiKey', label: 'API key' },
                  ]}
                />
              </Field>
              {api.auth !== 'none' && (
                <Field label={api.auth === 'bearer' ? 'Token' : 'API key'}>
                  <input type="password" className={input} value={api.token} onChange={(e) => setApi({ ...api, token: e.target.value })} autoComplete="off" />
                </Field>
              )}
              <Field label="Sample response (optional, JSON)">
                <textarea
                  rows={5}
                  className={cn(input, 'font-mono text-xs resize-none custom-scrollbar')}
                  value={api.sample}
                  onChange={(e) => setApi({ ...api, sample: e.target.value })}
                  placeholder='Paste a response to infer the SQL columns'
                />
              </Field>
            </>
          )}

          {tab === 'zetaris' && (
            <>
              <p className="text-sm text-[#334139]/80 leading-relaxed">
                Zetaris virtualizes every linked database, file and API behind one SQL endpoint, so agents query them
                without separate connectors.
              </p>
              <div className="text-xs font-semibold text-[#334139]">Linked this session</div>
              {linked.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#334139]/25 py-8 text-center text-xs text-[#334139]/55">
                  Nothing linked yet. Add a file, database or API.
                </div>
              ) : (
                <ul className="divide-y divide-[#334139]/10 rounded-2xl border border-[#334139]/15 bg-white">
                  {linked.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#334139]">
                      <Check size={14} className="text-[#064C1C]" />
                      <span className="font-mono font-semibold truncate">zetaris.{r.format}.{r.name}</span>
                      <span className="ml-auto text-[10px] font-mono uppercase text-[#334139]/55">{r.format}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {error && <div className="text-xs font-medium text-red-700">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-7 py-4 border-t border-[#334139]/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-semibold text-[#334139] hover:text-[#D66F14] hover:bg-[#D66F14]/10 transition-colors cursor-pointer"
          >
            {tab === 'zetaris' ? 'Close' : 'Cancel'}
          </button>
          {tab !== 'zetaris' && (
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-[#064C1C] text-[#FDFFFC] hover:bg-[#D66F14] transition-colors disabled:opacity-30 disabled:hover:bg-[#064C1C] disabled:cursor-not-allowed cursor-pointer"
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
