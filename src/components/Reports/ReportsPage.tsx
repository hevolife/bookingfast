import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Euro, 
  Calendar,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Clock,
  Star,
  Target,
  Activity
} from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useServices } from '../../hooks/useServices';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type Period = 'week' | 'month' | 'quarter' | 'year';

export function ReportsPage() {
  const { bookings, loading: bookingsLoading } = useBookings();
  const { services } = useServices();
  const { settings } = useBusinessSettings();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    // Définir la plage de dates par défaut selon la période
    const end = new Date();
    const start = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, [selectedPeriod]);

  // Filtrer les réservations par période
  const filteredBookings = bookings.filter(b => {
    if (!dateRange.start || !dateRange.end) return true;
    return b.date >= dateRange.start && b.date <= dateRange.end;
  });

  // Calculer les statistiques
  const stats = {
    totalRevenue: filteredBookings.reduce((sum, b) => sum + b.total_amount, 0),
    totalBookings: filteredBookings.length,
    averageBookingValue: filteredBookings.length > 0 
      ? filteredBookings.reduce((sum, b) => sum + b.total_amount, 0) / filteredBookings.length 
      : 0,
    uniqueClients: new Set(filteredBookings.map(b => b.client_email)).size,
    completedBookings: filteredBookings.filter(b => b.booking_status === 'confirmed').length,
    cancelledBookings: filteredBookings.filter(b => b.booking_status === 'cancelled').length,
    pendingPayments: filteredBookings.filter(b => b.payment_status === 'pending').length,
    completedPayments: filteredBookings.filter(b => b.payment_status === 'completed').length
  };

  // Données pour le graphique de revenus par jour
  const revenueByDay = filteredBookings.reduce((acc, booking) => {
    const date = booking.date;
    if (!acc[date]) {
      acc[date] = { date, revenue: 0, bookings: 0 };
    }
    acc[date].revenue += booking.total_amount;
    acc[date].bookings += 1;
    return acc;
  }, {} as Record<string, { date: string; revenue: number; bookings: number }>);

  const revenueChartData = Object.values(revenueByDay)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: d.revenue,
      bookings: d.bookings
    }));

  // Données pour le graphique des services
  const serviceStats = services.map(service => {
    const serviceBookings = filteredBookings.filter(b => b.service_id === service.id);
    return {
      name: service.name,
      bookings: serviceBookings.length,
      revenue: serviceBookings.reduce((sum, b) => sum + b.total_amount, 0)
    };
  }).filter(s => s.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Données pour le graphique des statuts de paiement
  const paymentStatusData = [
    { name: 'Payé', value: stats.completedPayments, color: '#10b981' },
    { name: 'En attente', value: stats.pendingPayments, color: '#f59e0b' },
    { name: 'Partiel', value: filteredBookings.filter(b => b.payment_status === 'partial').length, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  // Top clients
  const clientStats = filteredBookings.reduce((acc, booking) => {
    const key = `${booking.client_firstname} ${booking.client_name}`;
    if (!acc[key]) {
      acc[key] = {
        name: key,
        email: booking.client_email,
        bookings: 0,
        revenue: 0
      };
    }
    acc[key].bookings += 1;
    acc[key].revenue += booking.total_amount;
    return acc;
  }, {} as Record<string, { name: string; email: string; bookings: number; revenue: number }>);

  const topClients = Object.values(clientStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Taux de conversion
  const conversionRate = stats.totalBookings > 0 
    ? (stats.completedBookings / stats.totalBookings) * 100 
    : 0;

  // Exporter les données
  const exportToCSV = () => {
    const headers = ['Date', 'Client', 'Service', 'Montant', 'Statut', 'Paiement'];
    const rows = filteredBookings.map(b => [
      b.date,
      `${b.client_firstname} ${b.client_name}`,
      services.find(s => s.id === b.service_id)?.name || '',
      b.total_amount.toFixed(2),
      b.booking_status,
      b.payment_status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapports_${dateRange.start}_${dateRange.end}.csv`;
    a.click();
  };

  if (bookingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Rapports Avancés</h1>
              <p className="text-white/90 text-lg">Analyse détaillée de votre activité</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exporter CSV
          </button>
        </div>

        {/* Sélecteur de période */}
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'week', label: '7 derniers jours' },
            { key: 'month', label: '30 derniers jours' },
            { key: 'quarter', label: '3 derniers mois' },
            { key: 'year', label: '12 derniers mois' }
          ].map(period => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key as Period)}
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
                selectedPeriod === period.key
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Plage de dates personnalisée */}
        <div className="mt-4 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Période personnalisée :</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60"
          />
          <span>→</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60"
          />
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Chiffre d'affaires"
          value={`${stats.totalRevenue.toFixed(2)}€`}
          icon={Euro}
          color="from-green-500 to-emerald-500"
          trend={12.5}
        />
        <KPICard
          title="Réservations"
          value={stats.totalBookings.toString()}
          icon={Calendar}
          color="from-blue-500 to-cyan-500"
          trend={8.3}
        />
        <KPICard
          title="Clients uniques"
          value={stats.uniqueClients.toString()}
          icon={Users}
          color="from-purple-500 to-pink-500"
          trend={15.7}
        />
        <KPICard
          title="Panier moyen"
          value={`${stats.averageBookingValue.toFixed(2)}€`}
          icon={Target}
          color="from-orange-500 to-red-500"
          trend={-3.2}
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du CA */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            Évolution du chiffre d'affaires
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Revenus (€)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Réservations par service */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Performance par service
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenus (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statuts et analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statuts de paiement */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-500" />
            Statuts de paiement
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Taux de conversion */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-6 h-6 text-orange-500" />
            Taux de conversion
          </h3>
          <div className="flex flex-col items-center justify-center h-[250px]">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#10b981"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(conversionRate / 100) * 502.4} 502.4`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Confirmées</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-600">
                {stats.completedBookings} / {stats.totalBookings} réservations
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Statistiques clés
          </h3>
          <div className="space-y-4">
            <StatItem
              label="Réservations confirmées"
              value={stats.completedBookings}
              total={stats.totalBookings}
              color="green"
            />
            <StatItem
              label="Réservations annulées"
              value={stats.cancelledBookings}
              total={stats.totalBookings}
              color="red"
            />
            <StatItem
              label="Paiements complétés"
              value={stats.completedPayments}
              total={stats.totalBookings}
              color="blue"
            />
            <StatItem
              label="Paiements en attente"
              value={stats.pendingPayments}
              total={stats.totalBookings}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Top clients */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-500" />
          Top 10 clients
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-bold text-gray-700">Rang</th>
                <th className="text-left py-3 px-4 font-bold text-gray-700">Client</th>
                <th className="text-left py-3 px-4 font-bold text-gray-700">Email</th>
                <th className="text-right py-3 px-4 font-bold text-gray-700">Réservations</th>
                <th className="text-right py-3 px-4 font-bold text-gray-700">CA généré</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((client, index) => (
                <tr key={client.email} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{client.name}</td>
                  <td className="py-3 px-4 text-gray-600">{client.email}</td>
                  <td className="py-3 px-4 text-right font-medium">{client.bookings}</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">
                    {client.revenue.toFixed(2)}€
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
}

function KPICard({ title, value, icon: Icon, color, trend }: KPICardProps) {
  return (
    <div className={`bg-gradient-to-r ${color} rounded-2xl p-6 text-white transform hover:scale-105 transition-all duration-300 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend >= 0 ? 'text-white' : 'text-white/80'
          }`}>
            {trend >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-white/80 text-sm">{title}</div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  total: number;
  color: 'green' | 'red' | 'blue' | 'orange';
}

function StatItem({ label, value, total, color }: StatItemProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colors[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
