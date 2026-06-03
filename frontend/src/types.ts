export type TableType = 'fact' | 'dimension' | 'source' | 'generated';

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  fkRefTable?: string;
  fkRefColumn?: string;
  description?: string;
}

export interface WarehouseNode {
  id: string; // e.g. "DimCustomer"
  name: string;
  type: TableType;
  columns: Column[];
  description: string;
  position: { x: number; y: number };
}

export interface WarehouseConnection {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface Transformation {
  id: string;
  name: string;
  inputType: 'SQL' | 'Python' | 'dbt';
  logic: string;
  inputColumns: string[];
  outputColumns: string[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'postgresql' | 'snowflake' | 'salesforce' | 'csv' | 'stripe';
  status: 'connected' | 'disconnected';
  tableCount: number;
  description: string;
}

export interface ValidationItem {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  category: 'keys' | 'relationships' | 'naming' | 'standards';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  actionRequired?: {
    type: 'apply_schema' | 'create_table' | 'highlight_table' | 'suggest_pipeline';
    payload: any;
  };
  isLoading?: boolean;
}
