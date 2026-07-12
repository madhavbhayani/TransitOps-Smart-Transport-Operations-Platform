import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, 
  ShieldCheck, 
  Activity, 
  LineChart, 
  ArrowRight,
  Settings,
  MapPin,
  Wrench,
  Sun,
  Moon
} from 'lucide-react';

export default function LandingPage() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Default is light mode as requested
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const roles = [
    {
      title: 'Fleet Manager',
      description: 'Oversee fleet assets, schedule maintenance, track the vehicle lifecycle, and optimize operational efficiency.',
      icon: <Settings className="w-8 h-8 text-primary-500" />
    },
    {
      title: 'Dispatcher',
      description: 'Create and manage trips, assign available vehicles and drivers, and actively monitor active deliveries in real-time.',
      icon: <MapPin className="w-8 h-8 text-primary-500" />
    },
    {
      title: 'Safety Officer',
      description: 'Ensure driver compliance, track license validity, and actively monitor safety scores across the organization.',
      icon: <ShieldCheck className="w-8 h-8 text-primary-500" />
    },
    {
      title: 'Financial Analyst',
      description: 'Review operational expenses, track fuel consumption, evaluate maintenance costs, and report on profitability.',
      icon: <LineChart className="w-8 h-8 text-primary-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary-500 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-500">
                TransitOps
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-surface-hover"
                aria-label="Toggle Dark Mode"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <a href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
                Sign In
              </a>
              <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-3xl mx-auto"
          >
            <motion.h1 variants={itemVariants} className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Manage Your Fleet with <span className="text-primary-600 dark:text-primary-500">Absolute Precision</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl text-muted mb-10 leading-relaxed">
              A centralized platform that empowers your organization to manage the complete lifecycle of transport operations—from vehicle registration and dispatching to maintenance and deep analytics.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="px-8 py-4 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all flex items-center justify-center gap-2 group">
                Access Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 text-base font-semibold text-foreground bg-surface border border-border hover:bg-surface-hover rounded-xl transition-all flex items-center justify-center gap-2">
                <Wrench className="w-5 h-5 text-muted" />
                Explore Features
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Roles / Features Section */}
      <div className="py-24 bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Built for Every Operational Role</h2>
            <p className="text-muted max-w-2xl mx-auto">TransitOps provides specialized tools and insights tailored to the exact needs of your team members.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roles.map((role, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl bg-background border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="w-16 h-16 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-6">
                  {role.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{role.title}</h3>
                <p className="text-muted leading-relaxed text-sm">
                  {role.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
