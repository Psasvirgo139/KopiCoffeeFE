import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getSellingReport } from "../../utils/dataProvider/admin";
import api from "../../utils/dataProvider/base";
import { n_f } from "../../utils/helpers";
import useDocumentTitle from "../../utils/documentTitle";

const normalizeRevenueRows = (raw) => {
  const rows = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  return rows.map((p) => ({
    label: p.label,
    totalRevenue: Number(p.total_sum ?? p.totalRevenue ?? p.total ?? p.sum ?? p.amount ?? 0),
    orderCount: p.orderCount ?? null,
    avgOrderValue: p.avgOrderValue ?? null,
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    year: p.year ?? null,
    month: p.month ?? null,
    week: p.week ?? null,
    quarter: p.quarter ?? null,
  }));
};

const AdminDashboard = () => {
  useDocumentTitle("Admin Dashboard");
  const userInfo = useSelector((state) => state.userInfo);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [chartType, setChartType] = useState("line");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  // Y-axis ticks mỗi 400k
const STEP_400K = 400_000;
const yTicks = useMemo(() => {
  const max = Math.max(0, ...chartData.map(x => Number(x.totalRevenue || 0)));
  const top = Math.max(STEP_400K, Math.ceil(max / STEP_400K) * STEP_400K);
  return Array.from({ length: top / STEP_400K + 1 }, (_, i) => i * STEP_400K);
}, [chartData]);


  const fetchData = useCallback(async () => {
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    toast.error("Start date must be before end date");
    return;
  }
  setLoading(true);
  try {
    const [summaryRes, reportRes] = await Promise.all([
      api.get("/apiv1/adminPanel/reports/summary", {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      }),
      getSellingReport(period, userInfo.token),
    ]);
    setSummary(summaryRes.data);               
    setChartData(normalizeRevenueRows(reportRes));
  } catch (err) {
    console.error(err);
    const msg = err?.response?.data?.detail || err?.message || "Failed to load dashboard data";
    toast.error(msg);
  } finally {
    setLoading(false);
  }
}, [period, startDate, endDate, userInfo.token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = { view: period };
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      const res = await api.get("/apiv1/adminPanel/reports/export", {
        params,
        headers: { Authorization: `Bearer ${userInfo?.token}` },
        responseType: "blob",
      });

      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `revenue_report_${period}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      const resp = err?.response?.data;
      const msg =
        resp?.message ||
        resp?.error ||
        (status ? `Export failed with status ${status}` : err?.message) ||
        "Failed to export report";
      toast.error(msg);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="global-px py-8 min-h-screen bg-gray-50">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s your business overview.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₫{n_f(summary?.todayRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary?.todayOrders || 0} orders</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₫{n_f(summary?.weekRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary?.weekOrders || 0} orders</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₫{n_f(summary?.monthRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary?.monthOrders || 0} orders</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Year</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₫{n_f(summary?.yearRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summary?.yearOrders || 0} orders</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-3 rounded-full mr-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold">{summary?.totalProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-pink-100 p-3 rounded-full mr-4">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Promos</p>
                <p className="text-2xl font-bold">{summary?.activePromos || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-full mr-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold">{summary?.pendingOrders || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button
                className={`btn ${period === 'weekly' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod('weekly')}
              >
                Weekly
              </button>
              <button
                className={`btn ${period === 'monthly' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod('monthly')}
              >
                Monthly
              </button>
              <button
                className={`btn ${period === 'quarterly' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod('quarterly')}
              >
                Quarterly
              </button>
              <button
                className={`btn ${period === 'yearly' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPeriod('yearly')}
              >
                Yearly
              </button>
            </div>

            <div className="flex gap-2">
              <button
                className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChartType('line')}
              >
                Line Chart
              </button>
              <button
                className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChartType('bar')}
              >
                Bar Chart
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-4">
            <div className="flex-1">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>


{/* Revenue Chart */}
<div className="bg-white rounded-lg shadow p-6 mb-8 overflow-visible">
  <div className="flex items-center justify-between mb-6 relative z-10">
    <h2 className="text-2xl font-bold">Revenue Overview</h2>
    <button
      onClick={handleExport}
      disabled={exportLoading}
      className={`btn btn-secondary ${exportLoading ? 'loading' : ''}`}
    >
      {exportLoading ? 'Exporting...' : 'Export to Excel'}
    </button>
  </div>
  <div className="relative z-0 h-[420px]">
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'line' ? (
        <LineChart
          data={chartData}
          margin={{ top: 24, right: 72, bottom: 12, left: 72 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" padding={{ left: 8, right: 8 }} />
          <YAxis
            width={96}
            tickMargin={10}
            allowDecimals={false}
            domain={[0, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={(v) => `₫${n_f(v)}`}
          />
          <Tooltip formatter={(v) => `₫${n_f(v)}`} labelStyle={{ color: '#000' }} />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalRevenue"
            stroke="#6A4029"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Revenue"
          />
        </LineChart>
      ) : (
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 72, bottom: 12, left: 72 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" padding={{ left: 8, right: 8 }} />
          <YAxis
            width={96}
            tickMargin={10}
            allowDecimals={false}
            domain={[0, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={(v) => `₫${n_f(v)}`}
          />
          <Tooltip formatter={(v) => `₫${n_f(v)}`} labelStyle={{ color: '#000' }} />
          <Legend />
          <Bar dataKey="totalRevenue" fill="#6A4029" name="Revenue" />
        </BarChart>
      )}
    </ResponsiveContainer>
  </div>
</div>

        {/* Statistics Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-2xl font-bold">Detailed Statistics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                  <th>Date Range</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, index) => (
                  <tr key={`${item.label}-${index}`} className="hover">
                    <td className="font-medium">{item.label}</td>
                    <td className="text-green-600 font-semibold">
                      ₫{n_f(item.totalRevenue || 0)}
                    </td>
                    <td>{item.orderCount ?? "—"}</td>
                    <td>{item.avgOrderValue != null ? `₫${n_f(item.avgOrderValue)}` : "—"}</td>
                    <td className="text-sm text-gray-600">
                      {(item.startDate && item.endDate) ? `${item.startDate} - ${item.endDate}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AdminDashboard;
