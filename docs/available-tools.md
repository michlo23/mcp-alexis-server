# AlexisHR MCP Tools Documentation

This document provides a comprehensive list of all available tools in the AlexisHR MCP server, including their parameters and filters.

## Authentication

All tools require authentication via a JWT token in the `Authorization` header. The token should be provided in the format:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Available Tools

The AlexisHR MCP server provides the following tools:

### Employee Tools

#### `getAllEmployees`

Fetches all employees from AlexisHR API with optional filtering and pagination.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 500 | Maximum number of results to return |
| `filters` | object | No | - | Filter criteria (see below) |

**Available Filters:**

| Filter | Type | Description |
|--------|------|-------------|
| `active` | boolean | Filter by employee's active status |
| `title` | string | Filter by employee's job title |
| `division` | string | Filter by employee's division |
| `organization` | string | Filter by employee's organization |
| `employeeNumber` | string | Filter by employee's number |
| `firstName` | string | Filter by employee's first name |
| `lastName` | string | Filter by employee's last name |
| `nationality` | string | Filter by employee's nationality |

**Example Usage:**

```json
{
  "name": "getAllEmployees",
  "input": {
    "limit": 100,
    "filters": {
      "active": true,
      "division": "Engineering"
    }
  }
}
```

#### `getEmployeeById`

Fetches a specific employee by their unique ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `employeeId` | string | Yes | - | The unique identifier of the employee |

**Example Usage:**

```json
{
  "name": "getEmployeeById",
  "input": {
    "employeeId": "12345"
  }
}
```

### Department Tools

#### `getAllDepartments`

Fetches all departments from AlexisHR API with optional filtering.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 500 | Maximum number of results to return |
| `filters` | object | No | - | Filter criteria (see below) |

**Available Filters:**

| Filter | Type | Description |
|--------|------|-------------|
| `name` | string | Filter by department name |
| `companyId` | string | Filter by company ID |
| `costCenterId` | string | Filter by cost center ID |
| `effectiveCostCenterId` | string | Filter by effective cost center ID |
| `parentId` | string | Filter by parent department ID |

**Example Usage:**

```json
{
  "name": "getAllDepartments",
  "input": {
    "limit": 50,
    "filters": {
      "companyId": "67890"
    }
  }
}
```

#### `getDepartmentById`

Fetches a specific department by its unique ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `departmentId` | string | Yes | - | The unique identifier of the department |

**Example Usage:**

```json
{
  "name": "getDepartmentById",
  "input": {
    "departmentId": "54321"
  }
}
```

### Leave Tools

#### `getAllLeaves`

Fetches all leaves from AlexisHR API with optional filtering.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | 500 | Maximum number of results to return |
| `filters` | object | No | - | Filter criteria (see below) |

**Available Filters:**

| Filter | Type | Description |
|--------|------|-------------|
| `employeeId` | string | Filter by employee ID |
| `typeId` | string | Filter by leave type ID |
| `status` | string | Filter by leave status |
| `startDate` | string | Filter by leave start date |
| `endDate` | string | Filter by leave end date |
| `duration` | string | Filter by leave duration |
| `gradePercentage` | string | Filter by leave grade percentage |

**Example Usage:**

```json
{
  "name": "getAllLeaves",
  "input": {
    "limit": 200,
    "filters": {
      "employeeId": "12345",
      "status": "approved"
    }
  }
}
```

#### `getLeaveById`

Fetches a specific leave by its unique ID.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `leaveId` | string | Yes | - | The unique identifier of the leave |

**Example Usage:**

```json
{
  "name": "getLeaveById",
  "input": {
    "leaveId": "98765"
  }
}
```

## Transport Types

The AlexisHR MCP server supports two transport types:

1. **Streamable HTTP** (modern) - Use the `/mcp` endpoint
2. **Server-Sent Events (SSE)** (legacy) - Use the `/sse` and `/messages` endpoints

For more details on transport types, refer to the [dual-transport-implementation.md](./dual-transport-implementation.md) document.
