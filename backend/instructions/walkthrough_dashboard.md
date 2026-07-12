# Dashboard API Enhancements

I have updated the Dashboard API to include new advanced statistics, fleet utilization metrics, and dynamic filtering based on your requirements.

## 🚀 Key Features Added

### 1. New Statistics & Metrics
The `GET /api/transitops/dashboard` endpoint now returns a comprehensive set of statistics:
- **Active Vehicles**: Vehicles currently `ON_TRIP`
- **Available Vehicles**: Vehicles currently `AVAILABLE`
- **Maintenance Vehicles**: Vehicles currently `IN_SHOP`
- **Active Trips**: Trips currently `DISPATCHED`
- **Pending Trips**: Trips in `DRAFT` status
- **Drivers on Duty**: Drivers currently `ON_TRIP`
- **Fleet Utilization**: A percentage value representing `(Active Vehicles / Total Vehicles) * 100`

### 2. Vehicle Status Breakdown
A new field `vehicleStatusBreakdown` is returned, which counts exactly how many vehicles are in each status:
```json
"vehicleStatusBreakdown": {
    "AVAILABLE": 12,
    "ON_TRIP": 4,
    "IN_SHOP": 2,
    "RETIRED": 0
}
```

### 3. Dynamic Filters
You can now pass query parameters to filter the dashboard data:
- **`vehicleType`**: e.g., `/api/transitops/dashboard?vehicleType=Truck` (Filters vehicle stats by type)
- **`status`**: e.g., `/api/transitops/dashboard?status=AVAILABLE` (Filters vehicles)
- **`region`**: e.g., `/api/transitops/dashboard?region=Mumbai` (Matches against trip `source` or `destination` fields)

## 🛠️ Files Modified
- **[dashboardController.js](file:///home/madhavbhayani/Projects/Madhav%20Projects/TransitOPS/transitops/backend/controllers/dashboardController.js)**: Updated to accept query parameters (`req.query`) and pass them to the service layer.
- **[dashboardService.js](file:///home/madhavbhayani/Projects/Madhav%20Projects/TransitOPS/transitops/backend/services/dashboardService.js)**: Completely rewritten to build dynamic SQL queries with parameters, execute concurrent grouping queries, and calculate derived metrics like Fleet Utilization and status breakdowns.

## ⚠️ Notes
- The API maintains backward compatibility for legacy fields (`alerts`, `currentMaintenance`) so that if the frontend still relies on those exact property names, nothing will break during your migration.
- Drivers are globally counted as "On Duty" if their status is `ON_TRIP`.

You can now start wiring these new fields into your frontend Dashboard UI!
