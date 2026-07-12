# TransitOps Analytics & Financial Intelligence API

## 1. Analytics Architecture
The Analytics module (`analyticsRoutes.js`, `analyticsController.js`, `analyticsService.js`) dynamically aggregates data in real-time using PostgreSQL PL/pgSQL functions (`analytics.get_vehicle_financials` and `analytics.get_trip_financials`) created in migration `008`. This ensures no redundant aggregations are stored physically, eliminating the risk of data desynchronization.

## 2. Data Source-of-Truth Mapping
- **Vehicles**: `vehicles.vehicles` (for acquisition cost, base status)
- **Maintenance**: `vehicles.vehicle_maintenance` (filtered by `status = 'COMPLETED'`)
- **Trips**: `trip_mgmt.trips` (filtered by `status = 'COMPLETED'`)
- **Fuel**: `finance_mgmt.fuel_logs` (filtered by `is_voided = FALSE`)
- **Other Expenses**: `finance_mgmt.expenses` (filtered by `status = 'RECORDED'`)

## 3. Fuel Efficiency Formula
`Fuel Efficiency (KM/L) = SUM(Completed Trip actual_distance) / SUM(Non-voided Fuel logs liters)`
*Rule: Never sum `trips.fuel_consumed` with `fuel_logs.liters` as that creates fuel double counting.*

## 4. Fleet Utilization Formula
`Fleet Utilization % = (Operational Vehicles ON_TRIP) / (Total Operational Vehicles) * 100`
*Rule: Vehicles with status `RETIRED` are completely excluded from the denominator.*

## 5. Operational Cost Formula (PDF Standard)
`Vehicle Operational Cost = SUM(Fuel Cost) + SUM(Completed Maintenance Cost)`
*Rule: TOLL and OTHER expenses are EXCLUDED from this core metric.*

## 6. Vehicle ROI Formula
`ROI Ratio = (Revenue - (Fuel Cost + Maintenance Cost)) / Acquisition Cost`
`ROI Percentage = ROI Ratio * 100`
*Rule: Calculated only per vehicle, not per trip.*

## 7. Monthly Revenue Calculation
Aggregates `trip_mgmt.trips.revenue` for `COMPLETED` trips grouped by the month of `completed_at`. Uses `generate_series(1, 12)` to ensure all 12 months are returned chronologically even if some months have zero revenue.

## 8. Top Costliest Vehicles Calculation
Calculates the `Vehicle Operational Cost` for all vehicles, sorts descending, and limits to the requested `limit` parameter (max 20).

## 9. Specific Trip Operational Cost Rule
`Trip Operational Cost = Trip-linked Fuel Cost + Trip-linked Other Expenses`
*Rule: Maintenance cost is NEVER artificially allocated to individual trips. Any attempt to allocate maintenance per trip is strictly prohibited unless formally added to business rules.*

## 10. Trip Profit Calculation
`Trip Profit = Trip Revenue - Trip Operational Cost`

## 11. Monthly Profitability Calculation
Calculates Revenue, Operational Cost (Fuel + Other Expenses), and Profit on a monthly basis using `generate_series(1, 12)` for a given year.

## 12. Date Filtering
Optional `startDate` and `endDate` query parameters apply filters directly to:
- `trips.completed_at`
- `fuel_logs.fuel_date`
- `vehicle_maintenance.end_date`

## 13. RBAC
- **FINANCIAL_ANALYST**: Full access to all endpoints.
- **FLEET_MANAGER**: Read access to fleet/vehicle-level analytics (Fuel Efficiency, Utilization, Op Cost, ROI, Costliest, Monthly Revenue).
- **DISPATCHER**: Read access to trip-level analytics (Specific Trip Analytics, Trip Profitability).
- **SAFETY_OFFICER**: No financial analytics access.

## 14. CSV Export
Provided natively via `GET /api/transitops/analytics/export/csv?type=<report_type>`. Supports `type` values: `fuel-efficiency`, `operational-cost`, `vehicle-roi`, `monthly-revenue`, `top-costliest-vehicles`, `trip-profitability`.

## 15. PostgreSQL Aggregation Strategy
Uses Common Table Expressions (CTEs) within PL/pgSQL functions to aggregate fuel, maintenance, and trips concurrently and join them to the vehicle table, avoiding N+1 queries. Uses `COALESCE` for default zeroes.

## 16. Response Design and Non-redundancy Rules
Responses are fully chart-ready arrays of domain objects. 
*Rule: The backend NEVER duplicates data into separate `chartLabels` and `chartValues` arrays. The frontend maps the domain properties directly.*

---

## 17. API Endpoints

### 17.1. Fuel Efficiency
**METHOD**: GET
**URL**: `/api/transitops/analytics/fuel-efficiency`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Calculates fleet and per-vehicle fuel efficiency.
**QUERY PARAMETERS**: `startDate`, `endDate`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "unit": "KM/L",
  "fleetAverage": 8.42,
  "vehicles": [
    {
      "vehicleId": 1,
      "registrationNumber": "GJ01AB1234",
      "name": "Tata Ace",
      "distance": 525,
      "fuelLiters": 60,
      "fuelEfficiency": 8.75
    }
  ]
}
```

### 17.2. Fleet Utilization
**METHOD**: GET
**URL**: `/api/transitops/analytics/fleet-utilization`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Calculates real-time fleet utilization percentage.
**QUERY PARAMETERS**: None
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "fleetUtilizationPercentage": 35.5,
  "totalOperationalVehicles": 20,
  "onTripVehicles": 7,
  "statusDistribution": [
    { "status": "AVAILABLE", "count": 13 },
    { "status": "ON_TRIP", "count": 7 }
  ]
}
```

### 17.3. Operational Cost
**METHOD**: GET
**URL**: `/api/transitops/analytics/operational-cost`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Calculates fuel and maintenance costs.
**QUERY PARAMETERS**: `startDate`, `endDate`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "totalOperationalCost": 750000,
  "totalFuelCost": 500000,
  "totalMaintenanceCost": 250000,
  "vehicles": [
    {
      "vehicleId": 1,
      "registrationNumber": "GJ01AB1234",
      "name": "Tata Ace",
      "fuelCost": 60000,
      "maintenanceCost": 25000,
      "operationalCost": 85000
    }
  ]
}
```

### 17.4. Vehicle ROI
**METHOD**: GET
**URL**: `/api/transitops/analytics/vehicle-roi`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Calculates ROI based on acquisition cost.
**QUERY PARAMETERS**: `startDate`, `endDate`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "vehicles": [
    {
      "vehicleId": 1,
      "registrationNumber": "GJ01AB1234",
      "name": "Tata Ace",
      "revenue": 500000,
      "operationalCost": 200000,
      "acquisitionCost": 850000,
      "roiRatio": 0.3529,
      "roiPercentage": 35.29
    }
  ]
}
```

### 17.5. Monthly Revenue
**METHOD**: GET
**URL**: `/api/transitops/analytics/monthly-revenue`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Shows 12-month revenue trend.
**QUERY PARAMETERS**: `year`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "year": 2026,
  "totalRevenue": 1500000,
  "months": [
    {
      "month": 1,
      "monthName": "January  ",
      "revenue": 100000
    }
  ]
}
```

### 17.6. Top Costliest Vehicles
**METHOD**: GET
**URL**: `/api/transitops/analytics/top-costliest-vehicles`
**ALLOWED ROLES**: FINANCIAL_ANALYST, FLEET_MANAGER
**PURPOSE**: Identifies vehicles with highest operational costs.
**QUERY PARAMETERS**: `startDate`, `endDate`, `limit` (max 20)
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "vehicles": [
    {
      "rank": 1,
      "vehicleId": 4,
      "registrationNumber": "GJ01XX9999",
      "name": "Heavy Truck",
      "operationalCost": 250000
    }
  ]
}
```

### 17.7. Analytics Overview
**METHOD**: GET
**URL**: `/api/transitops/analytics/overview`
**ALLOWED ROLES**: FINANCIAL_ANALYST
**PURPOSE**: Top-level KPI cards for the dashboard.
**QUERY PARAMETERS**: None
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "metrics": {
    "fleetFuelEfficiency": 8.42,
    "fleetUtilizationPercentage": 35.5,
    "totalOperationalCost": 750000,
    "totalRevenue": 1500000,
    "totalProfit": 750000,
    "averageVehicleRoiPercentage": 22.5
  }
}
```

### 17.8. Specific Trip Analytics
**METHOD**: GET
**URL**: `/api/transitops/analytics/trips/:tripId`
**ALLOWED ROLES**: FINANCIAL_ANALYST, DISPATCHER
**PURPOSE**: Detailed cost breakdown and profitability of a single trip.
**QUERY PARAMETERS**: None
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "analyticsFinalized": true,
  "trip": { ... },
  "metrics": {
    "revenue": 15000,
    "operationalCost": 6000,
    "profit": 9000,
    "fuelLiters": 60,
    "fuelEfficiency": 8.75
  },
  "costBreakdown": [
    { "category": "FUEL", "amount": 4500 },
    { "category": "OTHER_EXPENSES", "amount": 1500 }
  ]
}
```

### 17.9. Trip Profitability
**METHOD**: GET
**URL**: `/api/transitops/analytics/trips/profitability`
**ALLOWED ROLES**: FINANCIAL_ANALYST, DISPATCHER
**PURPOSE**: List of trips and their profitability.
**QUERY PARAMETERS**: `startDate`, `endDate`, `vehicleId`, `limit`, `sort`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "trips": [
    {
      "tripId": 5,
      "source": "Ahmedabad",
      "destination": "Mumbai",
      "registrationNumber": "GJ01AB1234",
      "revenue": 15000,
      "operationalCost": 6000,
      "profit": 9000
    }
  ]
}
```

### 17.10. Monthly Profitability
**METHOD**: GET
**URL**: `/api/transitops/analytics/monthly-profitability`
**ALLOWED ROLES**: FINANCIAL_ANALYST
**PURPOSE**: Complete month-by-month profit margins.
**QUERY PARAMETERS**: `year`
**SUCCESS RESPONSE**:
```json
{
  "success": true,
  "year": 2026,
  "months": [
    {
      "month": 1,
      "monthName": "January  ",
      "revenue": 100000,
      "operationalCost": 40000,
      "profit": 60000
    }
  ]
}
```

---

# Frontend Analytics Display Guide

NUMBER / KPI CARDS
------------------
**Analytics Overview:**
- `fleetFuelEfficiency` → KPI Number → Unit: KM/L
- `fleetUtilizationPercentage` → KPI Number → Unit: %
- `totalOperationalCost` → KPI Number → Currency
- `totalRevenue` → KPI Number → Currency
- `totalProfit` → KPI Number → Currency
- `averageVehicleRoiPercentage` → KPI Number → Unit: %

**Specific Trip Analytics:**
- `metrics.revenue` → KPI Number → Currency
- `metrics.operationalCost` → KPI Number → Currency
- `metrics.profit` → KPI Number → Currency
- `metrics.fuelLiters` → KPI Number → Litres
- `metrics.fuelEfficiency` → KPI Number → KM/L

CHARTS
------
**Fuel Efficiency:**
- Endpoint: `GET /analytics/fuel-efficiency`
- Recommended: Bar Chart
- Label: `vehicles[].registrationNumber`
- Value: `vehicles[].fuelEfficiency`

**Fleet Utilization:**
- Endpoint: `GET /analytics/fleet-utilization`
- Recommended: Pie / Doughnut Chart
- Label: `statusDistribution[].status`
- Value: `statusDistribution[].count`

**Operational Cost:**
- Endpoint: `GET /analytics/operational-cost`
- Recommended: Stacked Bar Chart
- X-axis: `vehicles[].registrationNumber`
- Series: `vehicles[].fuelCost`, `vehicles[].maintenanceCost`

**Vehicle ROI:**
- Endpoint: `GET /analytics/vehicle-roi`
- Recommended: Bar Chart
- X-axis: `vehicles[].registrationNumber`
- Value: `vehicles[].roiPercentage`

**Monthly Revenue:**
- Endpoint: `GET /analytics/monthly-revenue`
- Recommended: Line / Area Chart
- X-axis: `months[].monthName`
- Value: `months[].revenue`

**Top Costliest Vehicles:**
- Endpoint: `GET /analytics/top-costliest-vehicles`
- Recommended: Horizontal Bar Chart
- Label: `vehicles[].registrationNumber`
- Value: `vehicles[].operationalCost`

**Specific Trip Cost Breakdown:**
- Endpoint: `GET /analytics/trips/:tripId`
- Recommended: Pie / Doughnut Chart
- Label: `costBreakdown[].category`
- Value: `costBreakdown[].amount`

**Trip Profitability:**
- Endpoint: `GET /analytics/trips/profitability`
- Recommended: Bar Chart or Table
- Label: `tripId` or `source → destination`
- Values: `revenue`, `operationalCost`, `profit`

**Monthly Profitability:**
- Endpoint: `GET /analytics/monthly-profitability`
- Recommended: Grouped Bar Chart or Multi-Line Chart
- X-axis: `months[].monthName`
- Series: `months[].revenue`, `months[].operationalCost`, `months[].profit`

**General Display Rules:**
- Backend returns raw numeric values.
- Frontend applies ₹ currency formatting.
- Frontend maps domain arrays into chart library datasets.
- Backend does not duplicate `chartLabels`/`chartValues`.
- null analytics values should display as "N/A", not zero, when the metric cannot be calculated.
