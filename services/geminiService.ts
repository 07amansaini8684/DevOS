
import { GoogleGenAI, Type } from "@google/genai";
import { ToolType } from "../types";

function getAi() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

const INTENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tool: {
      type: Type.STRING,
      description: "The name of the tool to load.",
      enum: Object.values(ToolType),
    },
    payload: {
      type: Type.OBJECT,
      description: "Structured data required for the specific tool. Fields are optional and depend on the tool type selected.",
      properties: {
        method: { type: Type.STRING, description: "HTTP method (GET, POST, etc.) for ApiTester" },
        url: { type: Type.STRING, description: "Target URL for ApiTester" },
        headers: { type: Type.OBJECT, description: "Request headers", properties: { "Content-Type": { type: Type.STRING } } },
        body: { type: Type.STRING, description: "Request body or raw data string" },
        jsonObject: { type: Type.OBJECT, description: "Data for JsonViewer", properties: { data: { type: Type.STRING } } },
        schema: { type: Type.OBJECT, description: "Form schema for FormGenerator", properties: { title: { type: Type.STRING } } },
        columns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Column names for TableViewer" },
        data: { 
          type: Type.ARRAY, 
          items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, value: { type: Type.NUMBER } } },
          description: "Data array for TableViewer or ChartBuilder"
        },
        type: { type: Type.STRING, description: "Visual type (bar, line, area) for ChartBuilder" },
        language: { type: Type.STRING, description: "Programming language for CodeGenerator" },
        code: { type: Type.STRING, description: "Source code string for CodeGenerator" },
        title: { type: Type.STRING, description: "Custom title for the tool instance" },
        markdownContent: { type: Type.STRING, description: "Markdown text for MarkdownViewer" },
        command: { type: Type.STRING, description: "Command to execute in TerminalSimulator" },
        initialOutput: { type: Type.STRING, description: "Initial terminal output" },
        envs: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } }, description: "Environment variables for EnvManager" }
      }
    },
    message: {
      type: Type.STRING,
      description: "A short conversational response to the user explaining what is happening.",
    },
  },
  required: ["tool", "payload", "message"],
};

export const parseIntent = async (userInput: string) => {
  const ai = getAi();
  if (!ai) {
    return {
      tool: null,
      message: "Gemini API key is not set. Add VITE_GEMINI_API_KEY to your .env to use intent parsing.",
      payload: {},
    };
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userInput,
      config: {
        systemInstruction: `
          You are a developer workspace assistant. Your job is to parse user intent into a structured tool call.
          Mapping table:
          - test api, curl, endpoint -> ApiTester (payload: { method, url, headers, body })
          - view json, format json, pretty print -> JsonViewer (payload: { jsonObject })
          - build form, create form from json, json schema -> FormGenerator (payload: { schema })
          - view data, show table, browse data -> TableViewer (payload: { columns, data })
          - visualize, show chart, plot data -> ChartBuilder (payload: { type, data, config })
          - generate code, express route, script -> CodeGenerator (payload: { language, code, title })
          - show logs, stream logs, monitoring -> LogViewer (payload: { initialLogs })
          - read docs, markdown, documentation -> MarkdownViewer (payload: { markdownContent })
          - env variables, secrets, config -> EnvManager (payload: { envs })
          - terminal, shell, run command -> TerminalSimulator (payload: { command, initialOutput })

          Always return a valid JSON object. For 'jsonObject' or 'schema', you may populate the fields even if they don't exactly match the placeholder schema properties, but try to stay close to a standard representation.
        `,
        responseMimeType: "application/json",
        responseSchema: INTENT_SCHEMA,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return {
      tool: null,
      message: "I encountered an error parsing your request. Please try again.",
      payload: {},
    };
  }
};

/**
 * Code generation layer: takes task + optional language/framework and returns generated code.
 * Used by CodeGenerator component (separate from intent/parseIntent).
 */
export async function generateCodeFromTask(
  task: string,
  language?: string,
  framework?: string
): Promise<{ code: string; error: string | null }> {
  console.log('[generateCodeFromTask] Called with:', { task, language, framework });
  const ai = getAi();
  if (!ai) {
    console.log('[generateCodeFromTask] No AI client (missing VITE_GEMINI_API_KEY)');
    return { code: '', error: 'Set VITE_GEMINI_API_KEY in .env to generate code.' };
  }
  try {
    const lang = language || 'JavaScript';
    const fw = framework ? `Framework: ${framework}` : 'No specific framework';
    const prompt = `Generate production-ready code for the following developer task.

Task: ${task}
Language: ${lang}
${fw}

Requirements:
- Return only code, no markdown fences or explanations
- Include validation and error handling where appropriate
- Use clean coding practices`;
    console.log('[generateCodeFromTask] Sending request to Gemini (model: gemini-2.0-flash)...');
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {},
    });
    const text = response.text?.trim() ?? '';
    console.log('[generateCodeFromTask] Response received, text length:', text?.length ?? 0, 'preview:', text?.slice(0, 80) ?? '');
    const code = text.replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim();
    return { code: code || '// No code generated', error: null };
  } catch (err: any) {
    console.error('[generateCodeFromTask] Error:', err?.message ?? err, err);
    return { code: '', error: err?.message ?? 'Failed to generate code.' };
  }
}
