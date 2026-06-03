import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client to prevent crash when GEMINI_API_KEY is not defined yet
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    api_key_configured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    timestamp: new Date().toISOString()
  });
});

// Main chat and warehouse design automation endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, currentTables, currentConnections } = req.body;

    const systemInstruction = `You are an expert Data Warehouse Architect and ETL engineer named AuraAI.
You are assisting a developer in building and optimizing their "AuraBI" visual data warehouse workspace.

The customer's CURRENT visual schema comprises:
- Tables: ${JSON.stringify(currentTables || [])}
- Primary schema connections: ${JSON.stringify(currentConnections || [])}

Your response must be composed in JSON with two primary fields:
1. "text": (string) Your markdown-formatted conversational answer, design suggestions, or engineering feedback.
2. "action": (optional object) If the user specifically asks to create, update, or suggest a table, column, connection, or automated layout, return a valid action structure so the frontend can seamlessly map it visually!

Supported actions:
- "create_table":
  {
    "type": "create_table",
    "table": {
      "id": "DimPromotion",
      "name": "DimPromotion",
      "type": "dimension" | "fact" | "source" | "generated",
      "description": "Short summary",
      "columns": [
        { "name": "promotion_key", "type": "INT", "isPrimaryKey": true, "isForeignKey": false },
        { "name": "campaign_name", "type": "VARCHAR(100)", "isPrimaryKey": false, "isForeignKey": false }
      ],
      "position": { "x": 200, "y": 200 }
    }
  }
- "connect_tables":
  {
    "type": "connect_tables",
    "fromTable": "FactSales",
    "fromColumn": "promotion_key",
    "toTable": "DimPromotion",
    "toColumn": "promotion_key"
  }
- "suggest_pipeline":
  {
    "type": "suggest_pipeline",
    "pipelineName": "Promotion ETL",
    "sql": "SELECT ... FROM ... LIMIT ..."
  }

Ensure your entire output is valid JSON in this format:
{
  "text": "Your markdown answer explaining your architectural rationale, with any tables or transformations details",
  "action": null or the action object
}

Do not append any extra markdown backticks (like "\`\`\`json") outside of the JSON payload. Only return pure valid stringified JSON.`;

    const model = 'gemini-3.5-flash';
    const client = getAIClient();

    if (!client) {
      // Fallback gracefully with mock intelligence if API key is not present or is default
      let responseText = "### 💡 AuraAI Architect Helper (Offline Mode)\n\n" +
        "I'm operating in **local fallback mode** because your `GEMINI_API_KEY` is not linked or is set to a placeholder in `.env`.\n\n" +
        "To enable real AI architect reasoning with live database schemas, configure your Gemini API Key in **Settings > Secrets**.\n\n" +
        "Here are standard recommendations for your question: \"" + message + "\":\n\n";

      let suggestedAction: any = null;

      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('promotion') || lowerMsg.includes('marketing') || lowerMsg.includes('campaign')) {
        responseText += "I suggest creating a classic `DimPromotion` table to analyze campaign discount conversions. I have automatically visual-mapped a draft model for you below! Click **Apply Schema** to construct it on the canvas.";
        suggestedAction = {
          type: 'create_table',
          table: {
            id: 'DimPromotion',
            name: 'DimPromotion',
            type: 'dimension',
            description: 'Stores active marketing channels, campaign attributes, coupons, and discount brackets.',
            position: { x: 50, y: 220 },
            columns: [
              { name: 'promotion_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Surrogate primary key.' },
              { name: 'campaign_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false, description: 'Aggregated name record.' },
              { name: 'discount_percentage', type: 'DECIMAL(5,2)', isPrimaryKey: false, isForeignKey: false, description: 'Direct percentage offset.' },
              { name: 'start_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false, description: 'Campaign start frame.' }
            ]
          }
        };
      } else if (lowerMsg.includes('currency') || lowerMsg.includes('exchange') || lowerMsg.includes('foreign') || lowerMsg.includes('rate')) {
        responseText += "I recommend instantiating a `DimCurrency` dimension containing exchange rates. This connects nicely with Multi-Currency fact metrics. Click **Apply Schema** to draft it.";
        suggestedAction = {
          type: 'create_table',
          table: {
            id: 'DimCurrency',
            name: 'DimCurrency',
            type: 'dimension',
            description: 'Holds international exchange parameters mapped by ISO-4217 indices.',
            position: { x: 420, y: -80 },
            columns: [
              { name: 'currency_key', type: 'INT', isPrimaryKey: true, isForeignKey: false, description: 'Primary surrogate key.' },
              { name: 'currency_code', type: 'VARCHAR(3)', isPrimaryKey: false, isForeignKey: false, description: 'ISO code e.g. USD, EUR, GBP.' },
              { name: 'exchange_rate_to_usd', type: 'DECIMAL(14,6)', isPrimaryKey: false, isForeignKey: false, description: 'Current daily base calculation.' }
            ]
          }
        };
      } else if (lowerMsg.includes('etl') || lowerMsg.includes('pipeline') || lowerMsg.includes('transform') || lowerMsg.includes('dbt')) {
        responseText += "We can design an optimized SQL pipeline that normalizes transactional customer logs. I created an dbt/SQL transformation blueprint. Click **Apply Schema** to preview it in the Inspector.";
        suggestedAction = {
          type: 'suggest_pipeline',
          pipelineName: 'FctSales Normalization Log',
          sql: `WITH raw_log AS (
  SELECT * FROM src_postgres_web_orders
)
SELECT
  id as sales_key,
  md5(customer_email) as customer_key,
  qty as quantity,
  final_price as unit_price,
  (qty * final_price) as revenue,
  order_time
FROM raw_log;`
        };
      } else {
        responseText += "• **Surrogate Keys**: Ensure you are using system-generated primary keys rather than natural ones to isolate the warehouse from application database refactors.\n" +
          "• **Star Schema**: I can assist with splitting high-density JSON sources into distinct central **Fact** and peripheral **Dimension** structures.\n" +
          "• **dbt Best Practices**: I recommend wrapping staging queries in clean CTEs to isolate data processing blocks.\n\n" +
          "Try asking: *\"Add a promotion dimension table\"* or *\"Create a currency lookup table\"* to see high-fidelity automated visual reactions!";
      }

      res.json({
        text: responseText,
        action: suggestedAction
      });
      return;
    }

    // Call live Gemini endpoint with active user instructions
    const response = await client.models.generateContent({
      model: model,
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // low temperature for structured layout JSON outputs
        responseMimeType: 'application/json'
      }
    });

    const outputText = response.text || "{}";
    const resultJson = JSON.parse(outputText);
    res.json(resultJson);

  } catch (error: any) {
    console.error('Gemini call failure:', error);
    res.status(500).json({
      error: 'Failed to process AI response',
      message: error.message || 'Unknown backend failure'
    });
  }
});

// Start server configuration
async function initializeServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AuraBI Server] Active on port ${PORT}`);
  });
}

initializeServer();
