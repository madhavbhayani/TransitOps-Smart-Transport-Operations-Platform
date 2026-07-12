# Driver Management

## Architecture
The Driver Management module is designed to track driver lifecycles, licenses, statuses, and safety scores. It uses `drivers.drivers` as the central source of truth.

### Existing `drivers.drivers` Table
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `license_number` (VARCHAR)
- `license_expiry` (DATE)
- `safety_score` (INTEGER, 0-100)
- `status` (VARCHAR: AVAILABLE, ON_TRIP, OFF_DUTY, SUSPENDED)

### Added Columns
- `license_category` (VARCHAR, e.g., HMV, LMV)
- `contact_number` (VARCHAR)

### New Tables
1. **`drivers.driver_status_history`**: Tracks all transitions of driver statuses securely.
2. **`drivers.driver_safety_history`**: Audit trail for safety score modifications.

## Business Rules & Logic
- **Statuses**: `AVAILABLE`, `ON_TRIP`, `OFF_DUTY`, `SUSPENDED`.
- **License Compliance**: 
  - `EXPIRED` if `license_expiry < CURRENT_DATE`
  - `EXPIRING_SOON` if within 30 days.
  - `VALID` otherwise.
- **Trip Integration**: 
  - Drivers with `EXPIRED` licenses or `SUSPENDED` status cannot be dispatched.
  - Dispatching a trip moves driver to `ON_TRIP` and logs a status history record automatically.
  - Completing/Cancelling a trip moves driver to `AVAILABLE` and logs a status history record automatically.
  - Redundant status updates (e.g., trying to set an `ON_TRIP` driver to `AVAILABLE` manually) are blocked by the `driverService`.

## API Endpoints

All endpoints use the prefix: `/api/transitops/drivers`
All endpoints require `Authorization: Bearer <TOKEN>`

### 1. Create Driver
**METHOD**: POST
**URL**: `/`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Create a new driver profile with an initial status of AVAILABLE.
**REQUEST**:
```json
{
  "name": "Alex",
  "licenseNumber": "GJ142022001234",
  "licenseCategory": "HMV",
  "licenseExpiry": "2027-08-15",
  "contactNumber": "9876543210",
  "safetyScore": 100
}
```
**SUCCESS RESPONSE (201)**: `{"success": true, "driver": {...}}`
**COMMON ERROR**: `400 Bad Request` (License number already exists)

### 2. List Drivers
**METHOD**: GET
**URL**: `/`
**ROLE**: SAFETY_OFFICER, DISPATCHER
**PURPOSE**: Return all drivers with optional query string filters (`?status=AVAILABLE&licenseCategory=HMV`).
**SUCCESS RESPONSE**: `{"success": true, "drivers": [...]}`

### 3. Get Driver Details
**METHOD**: GET
**URL**: `/:id`
**ROLE**: SAFETY_OFFICER, DISPATCHER
**PURPOSE**: Fetch detailed driver data including dynamically calculated `licenseStatus`.
**SUCCESS RESPONSE**: `{"success": true, "driver": {...}}`

### 4. Update Driver
**METHOD**: PATCH
**URL**: `/:id`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Update basic driver profile data. Directly updating status or safetyScore is ignored/blocked here.
**SUCCESS RESPONSE**: `{"success": true, "driver": {...}}`

### 5. Suspend Driver
**METHOD**: POST
**URL**: `/:id/suspend`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Move an AVAILABLE or OFF_DUTY driver into SUSPENDED.
**REQUEST**:
```json
{ "reason": "Repeated safety violations" }
```
**SUCCESS RESPONSE**: `{"success": true, "message": "Driver suspended successfully"}`

### 6. Restore Driver
**METHOD**: POST
**URL**: `/:id/restore`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Restore a SUSPENDED driver back to AVAILABLE (provided license is not expired).
**SUCCESS RESPONSE**: `{"success": true, "message": "Driver restored successfully"}`

### 7. Mark Off Duty / Available
**METHOD**: POST
**URL**: `/:id/off-duty` (or `/:id/available`)
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Toggle driver availability.
**SUCCESS RESPONSE**: `{"success": true, "message": "..."}`

### 8. Update Safety Score
**METHOD**: POST
**URL**: `/:id/safety-score`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: Overwrite the driver's safety score and generate an audit trail record.
**REQUEST**:
```json
{ "safetyScore": 82, "reason": "Safety review after incident" }
```
**SUCCESS RESPONSE**: `{"success": true, "message": "Safety score updated"}`

### 9. Driver Histories
**METHOD**: GET
**URL**: `/:id/status-history` and `/:id/safety-history`
**ROLE**: SAFETY_OFFICER
**PURPOSE**: View historical logs for statuses and safety scores.
**SUCCESS RESPONSE**: `{"success": true, "history": [...]}`

### 10. License Compliance
**METHOD**: GET
**URL**: `/compliance/licenses`
**ROLE**: SAFETY_OFFICER, DISPATCHER
**PURPOSE**: Return aggregated data of driver licenses grouped by VALID, EXPIRING_SOON, and EXPIRED.
**SUCCESS RESPONSE**: `{"success": true, "drivers": [...], "summary": {"totalDrivers": 20, ...}}`

### 11. Search and Filter
**METHOD**: GET
**URL**: `/search?search=Alex` and `/filter?minSafetyScore=80`
**ROLE**: SAFETY_OFFICER, DISPATCHER
**PURPOSE**: Find drivers using string search or specific parameterized filters.
