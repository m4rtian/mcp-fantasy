#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerYahooTools } from "./tools.js";

const server = new McpServer({ name: "yahoo-fantasy-read-only", version: "0.1.0" });
registerYahooTools(server);
await server.connect(new StdioServerTransport());
