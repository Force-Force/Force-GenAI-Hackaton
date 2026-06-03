import { useState } from 'react';
import { Database, CheckCircle2, XCircle, FileUp, AlertTriangle } from 'lucide-react';
import { Badge, Button, Panel } from '../../../components/ui';
import { usePipelineStore } from '../../workspace/store/pipelineStore';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { genId } from '../../../utils/graph';
import { parseCsv } from '../../../utils/parsers/csvParser';
import { parseSqlDdl } from '../../../utils/parsers/sqlDdlParser';
import { INITIAL_DATA_SOURCES } from '../../workspace/data/initialPipeline';
import type { Column, DataSource, PipelineNode } from '../../../types/pipeline';

type ImportFormat = 'csv' | 'sql';

export function DataSourceManager() {
  const [sources, setSources] = useState<DataSource[]>(INITIAL_DATA_SOURCES);
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState<string[]>([]);

  const addNode = usePipelineStore((s) => s.addNode);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);

  const toggle = (id: string) =>
    setSources((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'connected' ? 'disconnected' : 'connected' }
          : s,
      ),
    );

  const addResource = (name: string, columns: Column[], kind: DataSource['type']) => {
    const node: PipelineNode = {
      id: genId('src'),
      type: 'resource',
      position: { x: 60 + Math.random() * 120, y: 60 + Math.random() * 200 },
      data: {
        category: 'resource',
        kind: kind === 'csv' ? 'external' : 'source',
        label: name,
        description: `Imported from ${format.toUpperCase()}.`,
        warehouseRole: 'source',
        columns,
      },
    };
    addNode(node);
  };

  const handleImport = () => {
    setErrors([]);
    setImported([]);

    if (format === 'csv') {
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
    const content = await file.text();
    setText(content);
    setFormat(file.name.endsWith('.sql') ? 'sql' : 'csv');
  };

  return (
    <div className="h-full overflow-y-auto p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h2 className="text-sm font-sans font-bold text-slate-800">Connected Sources</h2>
        {sources.map((s) => (
          <Panel key={s.id} className="!rounded-lg">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                  <Database size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{s.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{s.tableCount} tables • {s.type}</div>
                </div>
              </div>
              <button onClick={() => toggle(s.id)} className="cursor-pointer" aria-label={`Toggle ${s.name}`}>
                {s.status === 'connected' ? (
                  <Badge tone="success"><CheckCircle2 size={11} /> Live</Badge>
                ) : (
                  <Badge tone="neutral"><XCircle size={11} /> Off</Badge>
                )}
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-sans font-bold text-slate-800">Import Schema</h2>
        <Panel className="!rounded-lg p-4 gap-3">
          <div className="flex items-center gap-2">
            <Button variant={format === 'csv' ? 'primary' : 'secondary'} onClick={() => setFormat('csv')}>CSV</Button>
            <Button variant={format === 'sql' ? 'primary' : 'secondary'} onClick={() => setFormat('sql')}>SQL DDL</Button>
            <label className="ml-auto">
              <input
                type="file"
                accept=".csv,.sql,.txt"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 cursor-pointer hover:underline font-semibold">
                <FileUp size={13} /> Upload file
              </span>
            </label>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={format === 'csv' ? 'id,name,amount\n1,Acme,100.5' : 'CREATE TABLE customers (\n  id INT PRIMARY KEY,\n  name VARCHAR(100)\n);'}
            aria-label="Schema import input"
            className="w-full h-40 bg-slate-900 text-cyan-300 font-mono text-[11px] p-3 rounded-lg outline-none resize-none border border-slate-800"
          />

          <Button variant="primary" onClick={handleImport} disabled={!text.trim()}>
            Parse & Add to Canvas
          </Button>

          {imported.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-700">
              <div className="font-bold flex items-center gap-1.5 mb-1"><CheckCircle2 size={12} /> Imported</div>
              {imported.map((i) => <div key={i} className="font-mono">{i}</div>)}
              <button onClick={() => setActiveTab('canvas')} className="mt-1.5 text-emerald-700 underline cursor-pointer font-semibold">
                View on canvas →
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-700">
              <div className="font-bold flex items-center gap-1.5 mb-1"><AlertTriangle size={12} /> Parser Notices</div>
              {errors.map((e, i) => <div key={i} className="font-mono">{e}</div>)}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
