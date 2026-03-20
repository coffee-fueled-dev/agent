---
name: convex-dev-agent
description: Agents organize your AI workflows into units, with message history and vector search built in. Use this skill whenever working with AI Agent or related Convex component functionality.
---

# AI Agent

## Instructions

The AI Agent component provides a structured framework for building agentic AI workflows with persistent message threads, automatic conversation context, and vector search capabilities. It separates long-running AI operations from your UI while maintaining real-time reactivity through Convex's websocket streaming. The component handles thread management, message persistence, file storage integration, and includes built-in debugging tools and usage tracking.

### Installation

```bash
npm install @convex-dev/agent
```

## Use cases

- Building customer support chatbots that need to maintain conversation history across multiple sessions and agents
- Creating multi-step AI workflows where different agents handle specific tasks like research, analysis, and reporting
- Implementing collaborative AI assistants where human agents and AI agents work together in shared threads
- Developing AI-powered applications that require RAG capabilities with hybrid vector and text search across conversation history
- Building usage-metered AI services that need per-user, per-agent cost tracking and rate limiting

## How it works

The component centers around Agents, Threads, and Messages as core abstractions. Agents encapsulate LLM prompting logic, tools, and behavior, while Threads persist conversation history that can be shared across multiple users and agents. Messages automatically include conversation context through built-in hybrid vector/text search within threads.

Streaming is handled through Convex's websocket infrastructure, enabling real-time text and object streaming without HTTP streaming complications. The component integrates with Convex file storage for automatic file handling with reference counting, and supports both static and dynamic workflows for complex multi-agent operations.

Debugging capabilities include callback functions, an agent playground for prompt iteration, and dashboard inspection. Usage tracking provides granular metrics per-provider, per-model, and per-user, while rate limiting integration helps manage API costs and provider limits.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by AI Agent is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Fagent)
- [GitHub repository](https://github.com/get-convex/agent)
- [Live demo](https://docs.convex.dev/agents)
- [Convex Components Directory](https://www.convex.dev/components/agent)
- [Convex documentation](https://docs.convex.dev)