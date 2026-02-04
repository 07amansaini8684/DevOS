
import { GoogleGenAI, Type } from "@google/genai";
import { ToolType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
