# AlexisHR MCP Server

A Model Context Protocol server that exposes AlexisHR API endpoints as MCP tools. This server supports both legacy SSE and streaming protocols.

## Features

- **JWT Authentication**: All requests require AlexisHR JWT authentication
- **MCP Protocol Support**: Full compliance with MCP protocol specification
- **Stream Support**: Supports both legacy SSE and modern streaming protocols
- **Session Management**: Maintains session state for client connections
- **API Tools**: Provides tools for accessing AlexisHR employee, department, and leave data

## Available Tools

### 1. getAllEmployees
Fetches all employees from AlexisHR API with optional filtering and pagination.

### 2. getEmployeeById
Fetches a specific employee by their unique ID.

### 3. getAllDepartments
Fetches all departments from AlexisHR API with optional filtering.

### 4. getDepartmentById
Fetches a specific department by its unique ID.

### 5. getAllLeaves
Fetches all leaves from AlexisHR API with optional filtering.

### 6. getLeaveById
Fetches a specific leave by its unique ID.

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Railway

### One-Click Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fyour-username%2Fmcp-alexis-server)

### Manual Deployment

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository or push using the Railway CLI
3. Configure the following environment variables:
   - `PORT` (optional, defaults to 3000)
   - `NODE_ENV` (set to "production" for production deployment)

## Usage

The server exposes an MCP endpoint at `/mcp` that can be accessed using any MCP client.

### Authentication

All tool executions require AlexisHR JWT token in Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Example Request (getAllEmployees)

```json
{
  "jsonrpc": "2.0",
  "id": "123",
  "method": "tool",
  "params": {
    "tool": "getAllEmployees",
    "parameters": {
      "limit": 100,
      "filters": {
        "active": true,
        "division": "Engineering"
      }
    }
  }
}
```

## License

MIT
