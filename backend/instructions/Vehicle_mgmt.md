# TransitOps Vehicle Management

## 1. Architecture
The Vehicle Management module follows the existing Node.js + Express + PostgreSQL architecture. It uses a clean layered approach:
- **Routes** (`routes/vehicleRoutes.js`, `routes/maintenanceRoutes.js`): Maps HTTP endpoints, validates JWTs, and enforces RBAC (Role-Based Access Control).
- **Controllers** (`controllers/vehicleController.js`): Handles request parsing and HTTP response mapping.
- **Services** (`services/vehicleService.js`): Contains all strict business logic and database transaction management.

## 2. PostgreSQL Schemas and Tables
All tables are isolated inside the `vehicles` PostgreSQL schema.

### 3. Purpose of Every Table
- `vehicles.vehicles`: Master registry for all vehicles in the fleet. Tracks core specs, acquisition cost, and current status.
- `vehicles.vehicle_status_history`: Immutable audit log recording every time a vehicle changes status (who, when, why, and what changed).
- `vehicles.vehicle_maintenance`: Tracks active and completed maintenance tasks, including costs and descriptions.
- `vehicles.vehicle_lifecycle`: High-level chronological timeline of key events (Registration, Retirements, Maintenance cycles).
- `vehicles.vehicle_utilization`: Aggregated operational metrics (trips, distance, hours) for analytical use.

### 4. Relationships and Foreign Keys
- `vehicle_status_history.vehicle_id` → `vehicles.vehicles(id)` (RESTRICT)
- `vehicle_status_history.changed_by` → `users.users(id)` (RESTRICT)
- `vehicle_maintenance.vehicle_id` → `vehicles.vehicles(id)` (RESTRICT)
- `vehicle_maintenance.created_by` → `users.users(id)` (RESTRICT)
- `vehicle_lifecycle.vehicle_id` → `vehicles.vehicles(id)` (RESTRICT)
- `vehicle_lifecycle.recorded_by` → `users.users(id)` (RESTRICT)
- `vehicle_utilization.vehicle_id` → `vehicles.vehicles(id)` (RESTRICT)

### 5. Vehicle Statuses
- `AVAILABLE`: Ready for dispatch.
- `ON_TRIP`: Currently deployed.
- `IN_SHOP`: Currently undergoing active maintenance.
- `RETIRED`: Permanently removed from service (Terminal state).

### 6. Allowed Status Transitions
- `AVAILABLE` → `IN_SHOP` (When maintenance starts)
- `IN_SHOP` → `AVAILABLE` (When maintenance completes or cancels)
- `AVAILABLE` / `IN_SHOP` → `RETIRED` (Manual retirement)
- *Note: `AVAILABLE` → `ON_TRIP` and `ON_TRIP` → `AVAILABLE` will be handled by Trip Management.*

### 7. Maintenance Workflow
1. User calls `POST /vehicles/:id/maintenance`. Vehicle enters `IN_SHOP`, Maintenance becomes `ACTIVE`.
2. User calls `POST /maintenance/:id/complete`. Vehicle returns to `AVAILABLE` (unless retired), Maintenance becomes `COMPLETED`.
3. If canceled via `POST /maintenance/:id/cancel`, Maintenance becomes `CANCELLED`, Vehicle returns to `AVAILABLE`.

### 8. Vehicle Lifecycle Workflow
Lifecycle entries (`REGISTERED`, `MAINTENANCE_STARTED`, `MAINTENANCE_COMPLETED`, `STATUS_CHANGED`, `RETIRED`) are generated transparently by the `vehicleService` during transactions.

### 9. Fleet Utilization Calculation
`fleetUtilizationPercentage` = `(ON_TRIP non-retired vehicles / Total non-retired vehicles) * 100`

### 10. RBAC Permissions
- `FLEET_MANAGER`: Full read/write access (Register, update, retire, maintenance).
- `DISPATCHER`: Read access to vehicles, maintenance, history, and lifecycle.
- `SAFETY_OFFICER`, `FINANCIAL_ANALYST`: Read-only access to core vehicle registry.

## 11. API Endpoints

### POST /api/transitops/vehicles
**Allowed:** FLEET_MANAGER
**Purpose:** Registers a new vehicle.
**Request:**
```json
{
  "registrationNumber": "GJ01AB1234",
  "name": "Tata Ace",
  "type": "MINI_TRUCK",
  "maxLoadCapacity": 750,
  "odometer": 84500,
  "acquisitionCost": 850000
}
```
**Success (201):**
```json
{
  "success": true,
  "vehicle": {
    "id": 1,
    "registration_number": "GJ01AB1234",
    "name": "Tata Ace",
    "status": "AVAILABLE"
  }
}
```

### GET /api/transitops/vehicles
**Allowed:** FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER, FINANCIAL_ANALYST
**Purpose:** List and filter vehicles.

### GET /api/transitops/vehicles/:id
**Allowed:** FLEET_MANAGER, DISPATCHER, SAFETY_OFFICER, FINANCIAL_ANALYST
**Purpose:** Fetch vehicle details, utilization, and active maintenance.

### PATCH /api/transitops/vehicles/:id
**Allowed:** FLEET_MANAGER
**Purpose:** Update general specs. Status cannot be modified here. Odometer cannot decrease.

### POST /api/transitops/vehicles/:id/mark-available
**Allowed:** FLEET_MANAGER
**Purpose:** Force vehicle to AVAILABLE if eligible.

### POST /api/transitops/vehicles/:id/retire
**Allowed:** FLEET_MANAGER
**Purpose:** Permanently retire a vehicle.

### POST /api/transitops/vehicles/:id/maintenance
**Allowed:** FLEET_MANAGER
**Purpose:** Start maintenance.
**Request:**
```json
{
  "maintenanceType": "Oil Change",
  "description": "Scheduled engine oil replacement",
  "startDate": "2026-07-12",
  "cost": 4500
}
```

### POST /api/transitops/vehicles/:vehicleId/maintenance/:maintenanceId/complete
**Allowed:** FLEET_MANAGER
**Purpose:** Complete maintenance.
**Request:**
```json
{
  "endDate": "2026-07-13",
  "cost": 4750
}
```

### POST /api/transitops/vehicles/:vehicleId/maintenance/:maintenanceId/cancel
**Allowed:** FLEET_MANAGER
**Purpose:** Cancel a mistakenly created maintenance record.

### GET /api/transitops/vehicles/:id/maintenance
**Allowed:** FLEET_MANAGER, DISPATCHER
**Purpose:** View maintenance history for a specific vehicle.

### GET /api/transitops/maintenance
**Allowed:** FLEET_MANAGER
**Purpose:** View all maintenance records across the fleet.

### GET /api/transitops/vehicles/:id/status-history
**Allowed:** FLEET_MANAGER, DISPATCHER
**Purpose:** View status audit trail.

### GET /api/transitops/vehicles/:id/lifecycle
**Allowed:** FLEET_MANAGER, DISPATCHER
**Purpose:** View lifecycle chronological events.

### GET /api/transitops/vehicles/utilization/summary
**Allowed:** FLEET_MANAGER
**Purpose:** Returns fleet utilization math.

### GET /api/transitops/vehicles/:id/utilization
**Allowed:** FLEET_MANAGER
**Purpose:** Returns total distance/trips for a specific vehicle.

## 13. Validation Errors & Business Rules Enforced
- Negative costs are blocked.
- Duplicate registration numbers trigger PostgreSQL uniqueness errors.
- Odometer rollovers (decreases) are blocked.
- Maintenance `endDate` before `startDate` is blocked.
- `ON_TRIP` vehicles cannot enter `IN_SHOP` or be `RETIRED`.
- `ACTIVE` maintenance prevents manual marking to `AVAILABLE`.
- Status is protected from random `PATCH` updates.

## Trip Management Integration Contract
Future Trip Management implementations MUST adhere to the following when integrating with vehicles:
1. Select only `AVAILABLE` vehicles for new trips.
2. Explicitly reject `IN_SHOP`, `RETIRED`, and `ON_TRIP` vehicles.
3. Validate cargo weight <= `max_load_capacity`.
4. On dispatch: Transition vehicle status `AVAILABLE` → `ON_TRIP`.
5. On trip completion: Transition vehicle status `ON_TRIP` → `AVAILABLE`.
6. On canceled dispatch: Transition vehicle status `ON_TRIP` → `AVAILABLE`.
7. Programmatically update `vehicles.vehicle_status_history` on state changes.
8. Add relevant `vehicles.vehicle_lifecycle` events (e.g., `TRIP_STARTED`).
9. Update `vehicles.vehicle_utilization` counters (trips, distance, hours).
