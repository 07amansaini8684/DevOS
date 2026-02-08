import React from 'react';
import { z } from 'zod';
import type { TamboComponent } from '@tambo-ai/react';

import ChartBuilder from '../components/Tools/ChartBuilder';
import ChartViewer from '../components/Tools/ChartViewer';
import TableViewer from '../components/Tools/TableViewer';
import CodeGenerator from '../components/Tools/CodeGenerator';
import JsonViewer from '../components/Tools/JsonViewer';
import ApiTester from '../components/Tools/ApiTester';
import MarkdownViewer from '../components/Tools/MarkdownViewer';
import FormGenerator from '../components/Tools/FormGenerator';
import LogViewer from '../components/Tools/LogViewer';
import EnvManager from '../components/Tools/EnvManager';
import TerminalSimulator from '../components/Tools/TerminalSimulator';

// Tambo components: each receives flat props from the AI and we pass them as payload to existing tools.
// Tambo does not support record types (dynamic keys); use explicit object shapes only.

const chartDataPointSchema = z.object({
  name: z.string(),
  value: z.number().optional(),
  value2: z.number().optional(),
  value3: z.number().optional(),
});

const tableRowSchema = z.object({
  name: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  value2: z.union([z.string(), z.number()]).optional(),
  value3: z.union([z.string(), z.number()]).optional(),
  label: z.string().optional(),
});

export const tamboComponents: TamboComponent[] = [
  {
    name: 'Graph',
    description: 'Displays data as charts (bar, line, or area) using Recharts. Use for sales, metrics, time series, or any numeric data by region or category.',
    component: (props: { data?: Array<{ name: string; value?: number; value2?: number; value3?: number }>; type?: 'bar' | 'line' | 'area' }) => (
      <ChartBuilder payload={{ data: props.data, type: props.type }} />
    ),
    propsSchema: z.object({
      data: z.array(chartDataPointSchema).optional().default([]).describe('Array of data points with name and value (optional value2, value3 for multiple series)'),
      type: z.enum(['bar', 'line', 'area']).optional().describe('Chart type: bar, line, or area'),
    }),
  },
  {
    name: 'ChartViewer',
    description: 'Visualize structured data (JSON arrays or objects like analytics) as charts. Use for: "visualize this", "show chart", "plot data", "generate graph", "show analytics". Pass data as JSON string or the AI can leave empty when user pastes data in chat.',
    component: (props: { data?: string }) => {
      const raw = props.data ?? '[]';
      let parsed: unknown = raw;
      try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        parsed = [];
      }
      return <ChartViewer payload={{ data: parsed }} />;
    },
    propsSchema: z.object({
      data: z.string().optional().default('[]').describe('JSON string: array of objects e.g. [{"day":"Mon","sessions":12}] or object with array key e.g. {"analytics":[{"name":"login","count":50}]}'),
    }),
  },
  {
    name: 'Table',
    description: 'Displays data in a table. Use for: "show as table", "display users", "view response in table". Accepts array of objects or nested like { users: [...] }. Auto-detects columns.',
    component: (props: { columns?: string[]; data?: unknown }) => (
      <TableViewer payload={{ data: props.data, columns: props.columns }} />
    ),
    propsSchema: z.object({
      columns: z.array(z.string()).optional().describe('Optional column headers'),
      data: z.array(tableRowSchema).optional().default([]).describe('Array of row objects, or leave empty when user pastes data in chat'),
    }),
  },
  {
    name: 'CodeBlock',
    description: 'Shows pre-written code with language and optional title. Use when you already have code to display.',
    component: (props: { code?: string; language?: string; title?: string }) => (
      <CodeGenerator payload={{ code: props.code, language: props.language, title: props.title }} />
    ),
    propsSchema: z.object({
      code: z.string().optional().default('').describe('The source code to display'),
      language: z.string().optional().describe('Programming language (e.g. javascript, python, typescript)'),
      title: z.string().optional().describe('Optional title for the code block'),
    }),
  },
  {
    name: 'CodeGenerator',
    description: 'Generates production-ready code from a natural language task. Use when the user asks to generate, create, or write code (e.g. "generate express login route", "create react signup form", "write prisma schema for users"). Pass the task and optional language/framework; the component will call the AI to generate code.',
    component: (props: { task?: string; language?: string; framework?: string }) => (
      <CodeGenerator payload={{ task: props.task, language: props.language, framework: props.framework }} />
    ),
    propsSchema: z.object({
      task: z.string().optional().default('').describe('The developer task in natural language (e.g. "express login route", "react signup form", "prisma schema for users")'),
      language: z.string().optional().describe('Programming language (e.g. JavaScript, TypeScript, Python)'),
      framework: z.string().optional().describe('Framework if relevant (e.g. Express, React, Prisma)'),
    }),
  },
  {
    name: 'JsonView',
    description: 'Formats and displays JSON data. Pass a JSON string (jsonContent). Use for API responses, config objects, or any JSON structure.',
    component: (props: { jsonContent?: string }) => {
      const data = props.jsonContent ?? '{}';
      return <JsonViewer payload={{ data }} />;
    },
    propsSchema: z.object({
      jsonContent: z.string().optional().default('{}').describe('JSON string to parse and display (e.g. from an API response or pasted payload)'),
    }),
  },
  {
    name: 'ApiRequest',
    description: 'REST API tester panel. Use when the user wants to test an endpoint, run a curl-like request, or inspect HTTP method, URL, and body.',
    component: (props: { method?: string; url?: string; contentType?: string; authorization?: string; body?: string }) => {
      const headers: Record<string, string> = {};
      if (props.contentType) headers['Content-Type'] = props.contentType;
      if (props.authorization) headers['Authorization'] = props.authorization;
      return <ApiTester payload={{ method: props.method, url: props.url, headers: Object.keys(headers).length ? headers : undefined, body: props.body }} />;
    },
    propsSchema: z.object({
      method: z.string().optional().describe('HTTP method: GET, POST, PUT, PATCH, DELETE'),
      url: z.string().optional().describe('Full request URL'),
      contentType: z.string().optional().describe('Content-Type header (e.g. application/json)'),
      authorization: z.string().optional().describe('Authorization header (e.g. Bearer token)'),
      body: z.string().optional().describe('Request body (raw string)'),
    }),
  },
  {
    name: 'Markdown',
    description: 'Renders markdown. Use for: "render markdown", "preview readme", "show documentation", "format this md", "view notes". Pass markdown text or leave empty when user pastes in chat.',
    component: (props: { content?: string; markdownContent?: string }) => (
      <MarkdownViewer payload={{ content: props.content ?? props.markdownContent, markdownContent: props.markdownContent ?? props.content }} />
    ),
    propsSchema: z.object({
      markdownContent: z.string().optional().default('').describe('Markdown text to render (e.g. README, docs, notes)'),
    }),
  },
  {
    name: 'FormBuilder',
    description: 'Generates an interactive form from a schema. Use when the user wants to create a form, input form, or dynamic form with fields like name, email, role. Supports text inputs, dropdowns (role options), and checkboxes.',
    component: (props: {
      title?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      roleOptions?: string[];
      active?: boolean;
    }) => {
      const schema: Record<string, unknown> =
        props.firstName !== undefined || props.lastName !== undefined || props.email !== undefined ||
        (props.roleOptions !== undefined && props.roleOptions.length > 0) || props.active !== undefined
          ? {
              ...(props.firstName !== undefined && { firstName: props.firstName }),
              ...(props.lastName !== undefined && { lastName: props.lastName }),
              ...(props.email !== undefined && { email: props.email }),
              ...(props.roleOptions !== undefined && props.roleOptions.length > 0 && { role: props.roleOptions }),
              ...(props.active !== undefined && { active: props.active }),
            }
          : {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              role: ['Admin', 'User', 'Guest'],
              active: true,
            };
      return <FormGenerator payload={{ schema }} />;
    },
    propsSchema: z.object({
      title: z.string().optional().describe('Form title'),
      firstName: z.string().optional().describe('Default value for first name field'),
      lastName: z.string().optional().describe('Default value for last name field'),
      email: z.string().optional().describe('Default value for email field'),
      roleOptions: z.array(z.string()).optional().describe('Options for role dropdown (e.g. Admin, User, Guest)'),
      active: z.boolean().optional().describe('Default value for active checkbox'),
    }),
  },
  {
    name: 'LogViewer',
    description: 'Displays logs in a structured viewer. Use for: "analyze logs", "debug this error", "show terminal output", "explain stack trace", "view logs". Pass logs as string or array of lines; leave empty when user pastes logs in chat.',
    component: (props: { logs?: string | string[] }) => (
      <LogViewer payload={{ logs: props.logs }} />
    ),
    propsSchema: z.object({
      logs: z.string().optional().default('').describe('Log text (multiline string or leave empty when user pastes in chat)'),
    }),
  },
  {
    name: 'EnvManager',
    description: 'View and edit .env variables. Use for: "show env file", "add env variable", "configure project", "edit api keys", "setup environment". Pass env content or leave empty when user pastes in chat.',
    component: (props: { envContent?: string }) => <EnvManager payload={{ envContent: props.envContent }} />,
    propsSchema: z.object({
      envContent: z.string().optional().default('').describe('Contents of .env file (KEY=value per line)'),
    }),
  },
  {
    name: 'Terminal',
    description: 'Controlled terminal: run commands (npm run dev, npm install, node -v, ls, git status, curl, cat). Opens when user says "run npm run dev", "check node version", "list files", etc. Streams output line-by-line; can auto-open Log/JSON/Table/Markdown viewer from output.',
    component: (props: { command?: string }) => <TerminalSimulator payload={{ command: props.command }} />,
    propsSchema: z.object({
      command: z.string().optional().describe('Command to execute (e.g. npm run dev, node -v, ls, git status)'),
      title: z.string().optional().describe('Optional title (e.g. Dev Terminal)'),
    }),
  },
];

export default tamboComponents;
