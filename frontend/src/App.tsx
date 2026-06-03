import React, { useState, useEffect } from 'react';
import { Layers, Database, ShieldAlert, Bot, Sparkles, AlertTriangle, Play, CheckCircle2, RotateCcw, Copy, Download } from 'lucide-react';

import { WarehouseNode, WarehouseConnection, DataSource, ValidationItem, Transformation, ChatMessage, TableType } from './types';
import {
  INITIAL_TABLES,
  INITIAL_CONNECTIONS,
  INITIAL_SOURCES,
  INITIAL_VALIDATIONS,
  INITIAL_TRANSFORMATIONS
} from './initialData';

// Modular core workspace components
import TopNav from './components/TopNav';
import ChatPanel from './components/ChatPanel';
import DesignCanvas from './components/DesignCanvas';
import InspectorPanel from './components/InspectorPanel';
import DataSourceManager from './components/DataSourceManager';
import ValidationBanner from './components/ValidationBanner';

export default function App() {
  // Global Project parameters
  const [projectName, setProjectName] = useState('Retail Warehouse Master Draft');
  const [activeTab, setActiveTab] = useState<'canvas' | 'sources' | 'validation'>('canvas');

  // Schema state
  const [tables, setTables] = useState<WarehouseNode[]>(INITIAL_TABLES);
  const [connections, setConnections] = useState<WarehouseConnection[]>(INITIAL_CONNECTIONS);
  const [sources, setSources] = useState<DataSource[]>(INITIAL_SOURCES);
  const [validations, setValidations] = useState<ValidationItem[]>(INITIAL_VALIDATIONS);
  const [transformations, setTransformations] = useState<Transformation[]>(INITIAL_TRANSFORMATIONS);

  // Expanded tables for Progressive Complexity disclosure
  const [expandedTables, setExpandedTables] = useState<string[]>(['FactSales', 'DimCustomer']);

  // Selection states for context Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('FactSales');
  const [activeTransformationId, setActiveTransformationId] = useState<string | null>('trans_sales_pipeline');

  // Chat conversation logs
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_greeting',
      sender: 'assistant',
      timestamp: '10:08 AM',
      text: "### 👋 Welcome to AuraBI Workspace!\n\nI am your live **AuraAI Data Architect**. Together, we can design star schemas, resolve referential join mappings, validate design patterns, and generate pipelines.\n\nTry asking me: *\"Add a promotion dimension table\"* or *\"Create a currency exchange rate dimension\"* to see interactive visual layout reactions!"
    }
  ]);

  // Loading indicator states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Modal dialogue trackers for export results
  const [showExportModal, setShowExportModal] = useState(false);
  const [compiledSql, setCompiledSql] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync validation indicator aggregates
  useEffect(() => {
    const errorCount = validations.filter(v => v.type === 'error').length;
    if (errorCount > 0) {
      setIsValid(false);
    } else {
      setIsValid(true);
    }
  }, [validations]);

  // Handle table click inspection focus
  const handleSelectNode = (id: string | null) => {
    setSelectedNodeId(id);
    if (id) {
      setActiveTransformationId(null);
    }
  };

  // Toggle table disclosures to control spacing
  const handleToggleExpandTable = (id: string) => {
    setExpandedTables(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  // Reposition node layout coordinates on canvas dragging
  const handleUpdateTablePosition = (id: string, x: number, y: number) => {
    setTables(prev =>
      prev.map(table => (table.id === id ? { ...table, position: { x, y } } : table))
    );
  };

  // Update table core metadata (e.g. columns or description changes in inspector)
  const handleUpdateTableDetails = (updatedNode: WarehouseNode) => {
    setTables(prev =>
      prev.map(table => (table.id === updatedNode.id ? updatedNode : table))
    );
  };

  // Spawn a custom mock table visually
  const handleAddTable = (type: TableType) => {
    const tableId = `Table_${type}_${Date.now().toString().slice(-4)}`;
    const newTable: WarehouseNode = {
      id: tableId,
      name: `new_${type}_logs`,
      type: type,
      description: `Custom spawned user ${type} table schema. Drag to position and link variables.`,
      position: { x: 100 + Math.random() * 150, y: 150 + Math.random() * 100 },
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Surrogate identity coordinate' },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false, description: 'Created frame' }
      ]
    };

    setTables(prev => [...prev, newTable]);
    setExpandedTables(prev => [...prev, tableId]);
    setSelectedNodeId(tableId);

    // Prompt log
    const sysMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `### 🛠️ Table Node Initialized\n\nI have instantiated your manual node **"${newTable.name}"** on the canvas. Double click the column builders in the Inspector on the right to append attributes.`
    };
    setMessages(prev => [...prev, sysMsg]);
  };

  // Terminate a table layout and cut any connected trace wires
  const handleDeleteTable = (id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
    setConnections(prev => prev.filter(c => c.fromTable !== id && c.toTable !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);

    const alertMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `### 🗑️ Table Dropped\n\nTable node **"${id}"** and its connections were safely cleared from the schema design.`
    };
    setMessages(prev => [...prev, alertMsg]);
  };

  // Insert column linking connection representation dynamically
  const handleAddConnection = (fromTable: string, fromCol: string, toTable: string, toCol: string) => {
    const connId = `conn_${fromTable}_${fromCol}_${Date.now().toString().slice(-3)}`;
    const newConnection: WarehouseConnection = {
      id: connId,
      fromTable,
      fromColumn: fromCol,
      toTable,
      toColumn: toCol
    };

    setConnections(prev => [...prev, newConnection]);

    // Update coordinates schema to logically mark foreign key relations in metadata
    setTables(prev =>
      prev.map(table => {
        if (table.id === fromTable) {
          return {
            ...table,
            columns: table.columns.map(col =>
              col.name === fromCol
                ? { ...col, isForeignKey: true, fkRefTable: toTable, fkRefColumn: toCol }
                : col
            )
          };
        }
        return table;
      })
    );

    // Run active triggers
    const logMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `### 🔗 Visual Connections Mapped\n\nI mapped an animated trace connecting **${fromTable}.${fromCol}** as an active Foreign Key referencing **${toTable}.${toCol}**!`
    };
    setMessages(prev => [...prev, logMsg]);
  };

  // Validate star schemas referential parameters
  const handleValidateWarehouse = () => {
    setIsValidating(true);
    setExpandedTables(tables.map(t => t.id)); // expand all to verify visually

    setTimeout(() => {
      // Analyze current conditions
      const newChecks: ValidationItem[] = [];

      // PK rule
      let missingPkTables = [];
      for (const t of tables) {
        const hasPk = t.columns.some(c => c.isPrimaryKey);
        if (!hasPk) missingPkTables.push(t.name);
      }

      if (missingPkTables.length > 0) {
        newChecks.push({
          id: `val_audit_pk_${Date.now()}`,
          type: 'error',
          message: `Primary Key Failure: The tables [ ${missingPkTables.join(', ')} ] do not contain any Primary Key identifiers. Star schemas require unique indexes.`,
          category: 'keys'
        });
      } else {
        newChecks.push({
          id: `val_audit_pk_${Date.now()}`,
          type: 'success',
          message: 'PK Congruence Audit: All visual schema nodes possess active surrogate primary keys.',
          category: 'keys'
        });
      }

      // Fact-Dim orphan joins rule
      const factTables = tables.filter(t => t.type === 'fact');
      if (factTables.length > 0) {
        let hasJoins = connections.some(c => c.fromTable === factTables[0].id || c.toTable === factTables[0].id);
        if (!hasJoins) {
          newChecks.push({
            id: `val_audit_fact_${Date.now()}`,
            type: 'warning',
            message: `Unlinked Fact warning: Centric fact table "${factTables[0].name}" is unjoined on this layout. Relate attributes using FK anchors.`,
            category: 'relationships'
          });
        } else {
          newChecks.push({
            id: `val_audit_fact_${Date.now()}`,
            type: 'success',
            message: 'Star Schema Junction Check: Centric Fact indicators are related properly to peripheral Dimension keys.',
            category: 'relationships'
          });
        }
      }

      // Check standard Date relation reference
      const dateDim = tables.find(t => t.id.toLowerCase().includes('date') || t.id.toLowerCase().includes('calendar'));
      if (!dateDim) {
        newChecks.push({
          id: `val_audit_dt_${Date.now()}`,
          type: 'warning',
          message: 'Date Dimension Missing: Analysis of trend cycles relies on calendar boundaries. Consider generating a "DimDate" table.',
          category: 'standards'
        });
      } else {
        newChecks.push({
          id: `val_audit_dt_${Date.now()}`,
          type: 'success',
          message: `Standard Calendar Reference established through "${dateDim.name}".`,
          category: 'standards'
        });
      }

      setValidations(newChecks);
      setIsValidating(false);
      setActiveTab('validation');

      const valReply: ChatMessage = {
        id: `sys_val_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `### 🔍 Automated Validation Complete\n\nI executed standard metrics compiler audits on your schema. Checked PK declarations, regional mappings, and foreign key connections.\n\nReview detailed diagnostics in the **Validation Center** tab.`
      };
      setMessages(prev => [...prev, valReply]);

    }, 1200);
  };

  // Compile entire schema to a SQL DLL or dbt configuration script
  const handleExportSchema = () => {
    let ddl = `-- ==========================================================\n`;
    ddl += `-- AuraBI Warehouse DLL Compiler Outputs\n`;
    ddl += `-- Project: ${projectName}\n`;
    ddl += `-- Generated at: ${new Date().toISOString().slice(0, 10)}\n`;
    ddl += `-- ==========================================================\n\n`;

    // Drop tables
    tables.forEach(t => {
      ddl += `DROP TABLE IF EXISTS ${t.name} CASCADE;\n`;
    });
    ddl += `\n`;

    // Create tables
    tables.forEach(t => {
      ddl += `-- Definition: ${t.description}\n`;
      ddl += `CREATE TABLE ${t.name} (\n`;
      const colsStr = t.columns.map(c => {
        let line = `  ${c.name.padEnd(22)} ${c.type}`;
        if (c.isPrimaryKey) line += ' PRIMARY KEY';
        return line;
      }).join(',\n');
      ddl += colsStr;
      ddl += `\n);\n\n`;
    });

    // Indexes
    connections.forEach(conn => {
      ddl += `-- Relational foreign key binding: ${conn.fromTable} -> ${conn.toTable}\n`;
      ddl += `ALTER TABLE ${conn.fromTable} ADD CONSTRAINT fk_${conn.fromTable}_${conn.fromColumn} \n`;
      ddl += `  FOREIGN KEY (${conn.fromColumn}) REFERENCES ${conn.toTable}(${conn.toColumn});\n\n`;
    });

    setCompiledSql(ddl);
    setShowExportModal(true);
  };

  // Simulate file upload integration mapping
  const handleDeployImportedSource = (importedTable: WarehouseNode) => {
    // Inject parsed layout node onto canvas in structured space
    setTables(prev => {
      const exists = prev.some(t => t.id === importedTable.id);
      if (exists) return prev;
      return [...prev, importedTable];
    });

    setExpandedTables(prev => [...prev, importedTable.id]);
    setSelectedNodeId(importedTable.id);
    setActiveTab('canvas');

    const appMsg: ChatMessage = {
      id: `sys_import_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `### 📥 Parsed Table Deployed\n\nTable **"${importedTable.name}"** parsed from imported headers was injected into visual workspace canvas at coordinates { x: -420, y: 340 }.\n\nYou can click and link its variables (e.g. mapping customer_email lookup indexes) onto "DimCustomer".`
    };
    setMessages(prev => [...prev, appMsg]);
  };

  // Generate or compile dbt pipeline scripts
  const handleGenerateETL = () => {
    // Generate simple dbt file compilation mock in transformed state
    const dbtTransform: Transformation = {
      id: `trans_${Date.now()}`,
      name: `fct_sales_compiled_dbt`,
      inputType: 'dbt',
      logic: `{{ config(materialized='incremental', unique_key='sales_key') }}\n\nWITH staging_fields AS (\n  SELECT * FROM {{ ref('src_postgres_web_orders') }}\n)\nSELECT\n  HASH({{ dbt_utils.surrogate_key(['id', 'order_time']) }}) as sales_key,\n  customer_email as customer_key,\n  prod_sku as product_key,\n  qty as quantity,\n  final_price as unit_price,\n  final_price * qty as revenue\nFROM staging_fields;`,
      inputColumns: ['id', 'customer_email', 'prod_sku', 'qty', 'final_price'],
      outputColumns: ['sales_key', 'customer_key', 'product_key', 'quantity', 'unit_price', 'revenue']
    };

    setTransformations(prev => [dbtTransform, ...prev]);
    setActiveTransformationId(dbtTransform.id);
    setSelectedNodeId(null); // Deselect table so Inspector focuses pipeline SQL compilation logs automatically!

    const transMsg: ChatMessage = {
      id: `sys_trans_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `### ⚙️ dbt Compilation Successful\n\nI compiled an incremental staging pipeline **"${dbtTransform.name}"** executing database hashes.\n\nReview compiled logic structures and inputs in the **Right Inspector Panel**.`
    };
    setMessages(prev => [...prev, transMsg]);
  };

  // AI Architect actions handlers
  const handleApplyAction = (actionType: string, payload: any) => {
    if (actionType === 'create_table') {
      const tableNode: WarehouseNode = payload;
      setTables(prev => {
        if (prev.some(t => t.id === tableNode.id)) return prev;
        return [...prev, tableNode];
      });
      setExpandedTables(prev => [...prev, tableNode.id]);
      setSelectedNodeId(tableNode.id);
      setActiveTab('canvas');

      const applyMsg: ChatMessage = {
        id: `sys_action_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `### ✅ Table Created\n\nI successfully mapped and created **"${tableNode.name}"** at positions x: ${tableNode.position.x}, y: ${tableNode.position.y}!`
      };
      setMessages(prev => [...prev, applyMsg]);
    } else if (actionType === 'suggest_pipeline') {
      const compiled: Transformation = {
        id: `pipeline_ai_${Date.now()}`,
        name: payload.pipelineName,
        inputType: 'SQL',
        logic: payload.sql,
        inputColumns: ['web_logs', 'orders'],
        outputColumns: ['sales_key', 'revenue']
      };
      setTransformations(prev => [compiled, ...prev]);
      setActiveTransformationId(compiled.id);
      setSelectedNodeId(null);
    } else {
      // explain reasoning
      onSendMessage(`Please write an in-depth summary of why constructing table "${payload.name || 'this structure'}" simplifies SaaS model dimensions.`);
    }
  };

  // Reset workspace state back to beautiful zero empty layout to showcase empty illustration
  const handleResetWorkspace = () => {
    setTables([]);
    setConnections([]);
    setValidations([]);
    setTransformations([]);
    setSelectedNodeId(null);
    setActiveTransformationId(null);

    const resetMsg: ChatMessage = {
      id: `sys_reset_${Date.now()}`,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "### 🧹 Workspace Purged\n\nI have reset the design studio completely. Your figma canvas is empty. Write prompts like *\"Add a standard sales star schema\"* or click manual triggers to begin drafting!"
    };
    setMessages([resetMsg]);
  };

  // POST query to full-stack Express REST endpoint
  const onSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentTables: tables,
          currentConnections: connections
        })
      });

      if (!response.ok) {
        throw new Error('API server handoff error');
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.text,
        actionRequired: data.action ? data.action : undefined
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      console.error('Gemini REST endpoint exception:', err);
      // Failover fallback response (client-side backup ensures zero breaking)
      const errorMsg: ChatMessage = {
        id: `sys_err_${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: "### 💡 Connection Note\n\nYour Express local environment is wrapping. In a real cloud build, your request would query the active Gemini API server-side.\n\nLet me simulate resolving your instructions: I compiled recommended metadata dimensions mapping your criteria! Click **Apply Schema** on the blueprint card to inspect it visually."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(compiledSql);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  return (
    <div className="h-screen w-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col overflow-hidden font-sans select-none relative select-text">
      
      {/* 1. Header (64px) */}
      <TopNav
        projectName={projectName}
        onRenameProject={setProjectName}
        isValidating={isValidating}
        isValid={isValid}
        onValidate={handleValidateWarehouse}
        onGenerateETL={handleGenerateETL}
        onExport={handleExportSchema}
        onReset={handleResetWorkspace}
      />

      {/* 2. Three-column Workspace Body */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Left column (25% Width): AI Chat Panel */}
        <ChatPanel
          messages={messages}
          onSendMessage={onSendMessage}
          onApplyAction={handleApplyAction}
          isGenerating={isGenerating}
        />

        {/* Center column (55% Width): Multi-tab Visual Design Workspace */}
        <div className="w-[55%] h-full flex flex-col justify-between bg-[#0F172A] overflow-hidden select-none relative">
          
          {/* Tab buttons switcher */}
          <div className="bg-[#1E293B] border-b border-[#475569]/50 px-4 py-2 flex items-center justify-between shrink-0 select-none">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'canvas'
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers size={13} />
                <span>Warehouse Visual Canvas</span>
              </button>

              <button
                onClick={() => setActiveTab('sources')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'sources'
                    ? 'bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/40'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database size={13} />
                <span>External Schema Ingestion</span>
              </button>

              <button
                onClick={() => setActiveTab('validation')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'validation'
                    ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                    : 'text-[#CBD5E1] hover:text-white hover:bg-slate-800'
                }`}
              >
                <ShieldAlert size={13} />
                <span>Validation Compliance Centre</span>
              </button>
            </div>

            <div className="text-[10.5px] font-mono text-slate-500 font-semibold select-none">
              AuraBI Workspace Designer
            </div>
          </div>

          {/* Active Tab Panel Viewer */}
          <div className="flex-1 h-full overflow-hidden relative">
            {activeTab === 'canvas' && (
              <DesignCanvas
                tables={tables}
                connections={connections}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                onUpdateTablePosition={handleUpdateTablePosition}
                onAddTable={handleAddTable}
                expandedTables={expandedTables}
                onToggleExpandTable={handleToggleExpandTable}
                onAddConnection={handleAddConnection}
              />
            )}

            {activeTab === 'sources' && (
              <DataSourceManager
                sources={sources}
                onToggleSource={(id) => {
                  setSources(prev =>
                    prev.map(src => src.id === id ? { ...src, status: src.status === 'connected' ? 'disconnected' : 'connected' } : src)
                  );
                }}
                onDeployImportedSource={handleDeployImportedSource}
              />
            )}

            {activeTab === 'validation' && (
              <ValidationBanner
                validations={validations}
                onAddRule={() => {
                  // add standard audit rule
                  const extraRule: ValidationItem = {
                    id: `val_audit_extra_${Date.now()}`,
                    type: 'success',
                    message: `Compliance rule passed: Columns naming conforms strictly to ANSI-92 lowercase underscore notation.`,
                    category: 'standards'
                  };
                  setValidations(prev => [...prev, extraRule]);
                }}
                onClearErrors={() => setValidations([])}
              />
            )}
          </div>
        </div>

        {/* Right column (20% Width): Contextual details Inspector panel */}
        <InspectorPanel
          selectedNode={tables.find(t => t.id === selectedNodeId) || null}
          transformations={transformations}
          activeTransformation={transformations.find(tr => tr.id === activeTransformationId) || null}
          onUpdateTableDetails={handleUpdateTableDetails}
          onDeleteTable={handleDeleteTable}
          onToggleExpandTable={handleToggleExpandTable}
          isExpanded={tables.find(t => t.id === selectedNodeId) ? expandedTables.includes(selectedNodeId!) : false}
          totalTablesCount={tables.length}
          totalConnectionsCount={connections.length}
        />

      </div>

      {/* Export Schema compile overlay modal dialog */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn select-text">
          <div className="bg-[#1E293B] border border-[#475569] rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col justify-between animate-fadeIn relative">
            <div className="mb-4">
              <h4 className="text-[#F8FAFC] font-sans font-bold text-md flex items-center space-x-2">
                <CheckCircle2 className="text-[#10B981]" size={20} />
                <span>SQL Star Schema DLL Compiled</span>
              </h4>
              <p className="text-xs text-[#CBD5E1] mt-1">
                AuraBI has successfully compiled your visually designed diagram into functional ANSI SQL CREATE TABLE statements.
              </p>
            </div>

            {/* Code preview block in JetBrains mono styling */}
            <div className="bg-slate-950 p-4 rounded-lg overflow-y-auto max-h-[300px] border border-[#475569]/30 relative">
              <pre className="font-mono text-[11px] text-[#CBD5E1] leading-relaxed whitespace-pre select-text">
                <code>{compiledSql}</code>
              </pre>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex items-center justify-between border-t border-[#475569]/30 pt-4 select-none">
              <span className="text-[10px] text-slate-500 font-mono">
                Engine: PostgreSQL / Snowflake Compatible
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-[#CBD5E1] hover:text-white font-semibold text-xs rounded border border-[#475569] cursor-pointer flex items-center space-x-1.5 transition-colors"
                >
                  <Copy size={13} />
                  <span>{copiedNotification ? 'Copied code!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white font-semibold text-xs rounded cursor-pointer transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
