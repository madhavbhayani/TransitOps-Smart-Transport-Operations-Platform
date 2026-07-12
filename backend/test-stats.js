const dashboardService = require('./services/dashboardService');
dashboardService.getDashboardStats().then(console.log).catch(console.error).finally(() => process.exit(0));
