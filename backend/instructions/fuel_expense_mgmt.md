# Fuel & Expense Management API Documentation

## Architecture & Schema

The Fuel and Expense Management module operates in the `finance_mgmt` PostgreSQL schema, ensuring strict separation from operational tables while maintaining referential integrity.

### Tables Created
- `finance_mgmt.fuel_logs`: Tracks individual fuel additions, cost, liters, and odometer readings.
- `finance_mgmt.expenses`: Tracks other operational expenses (`TOLL`, `OTHER`).
- `finance_mgmt.expense_status_history`: Logs changes to expense status (e.g. `RECORDED` -> `VOIDED`).

### Enums
- `finance_mgmt.expense_type`: `TOLL`, `OTHER`
- `finance_mgmt.expense_status`: `RECORDED`, `VOIDED`

### Core Business Rules
- **Fuel Source of Truth:** `finance_mgmt.fuel_logs` is the financial source of truth for fuel costs.
- **No Duplicate Maintenance Data:** Maintenance costs are read dynamically from `vehicles.vehicle_maintenance`. Users cannot manually add a `MAINTENANCE` expense in `finance_mgmt.expenses`.
- **Trip Consistency:** If a fuel log or expense is linked to a `trip_id`, its `vehicle_id` MUST match the trip's `vehicle_id`.
- **Auditing:** Financial records are never physically deleted. They are `VOIDED` using dedicated API endpoints. Voided records are excluded from financial analytics.

### Analytical Formulas Used
- **Operational Cost** = `SUM(fuel logs cost)` + `SUM(completed maintenance cost)`
- **Total Tracked Expenses** = `Operational Cost` + `SUM(toll and other expenses)`
- **Fuel Efficiency** = `SUM(completed trips actual_distance) / SUM(fuel logs liters)`
- **ROI Ratio** = `(SUM(completed trips revenue) - (Maintenance Cost + Fuel Cost)) / Acquisition Cost`

## API Endpoints

### 1. Record Fuel Log
- **METHOD**: `POST`
- **URL**: `/api/transitops/finance/fuel-logs`
- **ALLOWED ROLE**: `FINANCIAL_ANALYST`
- **PURPOSE**: Record a new fuel receipt.
- **REQUEST BODY**:
  ```json
  {
    "vehicleId": 1,
    "tripId": 5, // optional
    "liters": 60,
    "cost": 6000,
    "fuelDate": "2026-07-12",
    "odometer": 85025,
    "notes": "Fuel recorded after Mumbai delivery"
  }
  ```
- **SUCCESS RESPONSE (201)**: `{ "success": true, "fuelLog": { ... } }`

### 2. Void Fuel Log
- **METHOD**: `POST`
- **URL**: `/api/transitops/finance/fuel-logs/:id/void`
- **ALLOWED ROLE**: `FINANCIAL_ANALYST`
- **PURPOSE**: Void a fuel log so it no longer counts towards financial analytics.
- **REQUEST BODY**:
  ```json
  {
    "reason": "Entered in error"
  }
  ```
- **SUCCESS RESPONSE (200)**: `{ "success": true, "fuelLog": { ... } }`

### 3. Record Expense
- **METHOD**: `POST`
- **URL**: `/api/transitops/finance/expenses`
- **ALLOWED ROLE**: `FINANCIAL_ANALYST`
- **PURPOSE**: Record a new toll or miscellaneous expense.
- **REQUEST BODY**:
  ```json
  {
    "vehicleId": 1,
    "tripId": 5, // optional
    "expenseType": "TOLL",
    "amount": 1500,
    "expenseDate": "2026-07-12",
    "description": "Highway toll"
  }
  ```
- **SUCCESS RESPONSE (201)**: `{ "success": true, "expense": { ... } }`

### 4. Void Expense
- **METHOD**: `POST`
- **URL**: `/api/transitops/finance/expenses/:id/void`
- **ALLOWED ROLE**: `FINANCIAL_ANALYST`
- **PURPOSE**: Void an expense so it no longer counts towards financial analytics.
- **REQUEST BODY**:
  ```json
  {
    "reason": "Duplicate toll entry"
  }
  ```
- **SUCCESS RESPONSE (200)**: `{ "success": true, "expense": { ... } }`

### 5. Get Vehicle Analytics
- **URL**: `/api/transitops/finance/vehicles/:vehicleId/operational-cost`
- **URL**: `/api/transitops/finance/vehicles/:vehicleId/fuel-efficiency`
- **URL**: `/api/transitops/finance/vehicles/:vehicleId/roi`
- **URL**: `/api/transitops/finance/vehicles/:vehicleId/summary`
- **ALLOWED ROLES**: `FINANCIAL_ANALYST`, `FLEET_MANAGER`, `DISPATCHER`
- **PURPOSE**: Calculate live analytical metrics based on un-voided logs, completed trips, and completed maintenance.

### 6. CSV Export
- **METHOD**: `GET`
- **URL**: `/api/transitops/finance/export/csv?type=fuel&vehicleId=1`
- **ALLOWED ROLES**: `FINANCIAL_ANALYST`, `FLEET_MANAGER`, `DISPATCHER`
- **PURPOSE**: Generates and downloads a CSV file containing the requested financial data.
- **Supported `type` params**: `fuel`, `expenses`, `vehicle-summary`
