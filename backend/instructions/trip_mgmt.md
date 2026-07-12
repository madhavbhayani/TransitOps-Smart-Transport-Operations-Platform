# Trip Management Module

## 1. Architecture
Trip Management is integrated into the Node.js + Express + PostgreSQL backend using the standard layered pattern:
- **Routes (`tripRoutes.js`)**: Maps HTTP paths to the controller, applying `authenticate` and `requireRole(['DISPATCHER'])` middleware.
- **Controller (`tripController.js`)**: Handles HTTP requests/responses and catches validation exceptions.
- **Service (`tripService.js`)**: Performs business validation, queries non-mutating data, and delegates critical atomic state transitions to PostgreSQL PL/pgSQL functions.

## 2. `trip_mgmt` Schema
All trip-related structures are isolated in the `trip_mgmt` PostgreSQL schema.

## 3. Tables and Relationships
- `trip_mgmt.trips`: The core master table for all trips.
  - `vehicle_id` → `vehicles.vehicles(id)` (RESTRICT)
  - `driver_id` → `drivers.drivers(id)` (RESTRICT)
  - `created_by` → `users.users(id)` (RESTRICT)
- `trip_mgmt.trip_status_history`: Immutable audit trail for trip statuses.
  - `trip_id` → `trip_mgmt.trips(id)` (RESTRICT)
  - `changed_by` → `users.users(id)` (RESTRICT)

*Note: Redundant data (e.g., driver name, vehicle registration) is intentionally omitted from the trips table. They are pulled dynamically via JOINs in `tripService.js`.*

## 4. PostgreSQL Trip Status Enum
`trip_mgmt.trip_status` is explicitly an ENUM with values:
- `DRAFT`
- `DISPATCHED`
- `COMPLETED`
- `CANCELLED`

## 5. Trip Lifecycle
- `DRAFT` → `DISPATCHED`
- `DRAFT` → `CANCELLED`
- `DISPATCHED` → `COMPLETED` (Terminal)
- `DISPATCHED` → `CANCELLED` (Terminal)

## 6. Database Functions/Procedures
Critical trip state transitions are securely handled by PL/pgSQL stored procedures to ensure absolutely bulletproof atomicity across the disparate `trip_mgmt`, `vehicles`, and `drivers` schemas:
- `trip_mgmt.dispatch_trip(p_trip_id INT, p_user_id INT)`
- `trip_mgmt.complete_trip(p_trip_id INT, p_final_odometer NUMERIC, p_fuel_consumed NUMERIC, p_user_id INT)`
- `trip_mgmt.cancel_trip(p_trip_id INT, p_reason TEXT, p_user_id INT)`

## 7. Atomicity and Row-Locking Strategy
Inside each database function, the trip, vehicle, and driver records are fetched using `SELECT ... FOR UPDATE`. This creates strict row-level locks, utterly eliminating double-dispatch or concurrent modification race conditions before proceeding with validation and updates.

## 8 & 9. Vehicle and Driver Integration
- Dispatching transitions the vehicle and driver status to `ON_TRIP`.
- Completing or cancelling transitions the vehicle and driver back to `AVAILABLE`.
- Driver license expiry is validated dynamically during dispatch.
- Cargo weight is verified against `max_load_capacity`.

## 10. Vehicle Utilization Integration
- Upon `dispatch_trip`: Increments `total_trips`.
- Upon `complete_trip`: Increments `completed_trips`, adds to `total_distance`, and adds to `active_distance`.

## 11. RBAC
All Trip Management endpoints require the `DISPATCHER` role. The user ID performing the action is automatically passed into the database functions for auditing.

## 12 & 13 & 14 & 15. API Endpoints

### POST /api/transitops/trips
**Role:** DISPATCHER  
**Purpose:** Draft a new trip.  
**Request:**
```json
{
  "source": "Ahmedabad",
  "destination": "Mumbai",
  "vehicleId": 1,
  "driverId": 1,
  "cargoWeight": 450,
  "plannedDistance": 525,
  "revenue": 15000
}
```
**Success Response (201):**
```json
{ "success": true, "trip": { "id": 1, "status": "DRAFT", ... } }
```

### POST /api/transitops/trips/select-vehicles
**Role:** DISPATCHER  
**Purpose:** Select only AVAILABLE vehicles capable of carrying the requested load.  
**Request:**
```json
{ "cargoWeight": 450 }
```
**Success Response:** Returns array of vehicles.

### POST /api/transitops/trips/select-drivers
**Role:** DISPATCHER  
**Purpose:** Select only AVAILABLE drivers with non-expired licenses.  
**Request:** `{}`

### POST /api/transitops/trips/:id/dispatch
**Role:** DISPATCHER  
**Purpose:** Execute the `dispatch_trip` atomic operation.  
**Request:** `{}`  
**Success Response:** `{ "success": true, "message": "Trip dispatched successfully" }`  
**Error Response (400):** `{ "success": false, "message": "Cargo weight exceeds vehicle max load capacity" }`

### POST /api/transitops/trips/active
**Role:** DISPATCHER  
**Purpose:** Return all DISPATCHED trips with joined master data.  
**Request:** `{}`

### POST /api/transitops/trips/:id/complete
**Role:** DISPATCHER  
**Purpose:** Complete the trip, calculate actuals, and update utilization.  
**Request:**
```json
{
  "finalOdometer": 85025,
  "fuelConsumed": 60
}
```

### POST /api/transitops/trips/:id/cancel
**Role:** DISPATCHER  
**Purpose:** Cancel trip and restore vehicle/driver states.  
**Request:**
```json
{ "reason": "Customer cancelled shipment" }
```

### POST /api/transitops/trips/search
**Role:** DISPATCHER  
**Purpose:** ILIKE search across locations, driver names, licenses, etc.  
**Request:**
```json
{ "search": "Ahmedabad" }
```

### POST /api/transitops/trips/filter
**Role:** DISPATCHER  
**Purpose:** Optional filtered search on trips.  
**Request:**
```json
{
  "status": "DISPATCHED",
  "vehicleId": 1
}
```

### POST /api/transitops/trips/:id/details
**Role:** DISPATCHER  
**Purpose:** Fetch trip object joined with master info and history.

## 16. Business Validations Enforced
- Cannot dispatch IN_SHOP, RETIRED, or ON_TRIP vehicles.
- Cannot dispatch ON_TRIP, SUSPENDED, or OFF_DUTY drivers.
- Cannot dispatch expired licenses.
- Cargo strictly <= vehicle capacity.
- `final_odometer` strictly >= previous odometer on complete.
