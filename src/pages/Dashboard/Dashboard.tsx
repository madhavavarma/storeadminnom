import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import type { ICategory } from "@/interfaces/ICategory";
import type { IProduct } from "@/interfaces/IProduct";
import type { IOrder } from "@/store/OrdersSlice";

// Recharts imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { ShoppingBag, Tag, ShoppingCart, DollarSign } from "lucide-react";
import { getCategories, getOrders, getProducts, getAppSettings } from "../api";

export default function Dashboard({ refreshKey }: { refreshKey?: number }) {
  const [branding, setBranding] = useState<any>(null);
  useEffect(() => {
    getAppSettings().then((settings) => {
      setBranding(settings?.branding || null);
    });
  }, []);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [recentSortCol, setRecentSortCol] = useState<'id' | 'created_at' | 'totalprice' | 'status' | null>(null);
  const [recentSortDir, setRecentSortDir] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();

  // Date range state
  const [dateRange, setDateRange] = useState(() => {
    const stored = localStorage.getItem("dateRange");
    return stored ? JSON.parse(stored) : { label: "Today", value: "today", start: null, end: null };
  });
  useEffect(() => {
    const dateHandler = () => {
      const stored = localStorage.getItem("dateRange");
      setDateRange(stored ? JSON.parse(stored) : { label: "Today", value: "today", start: null, end: null });
    };
    window.addEventListener("dateRangeChanged", dateHandler);
    return () => window.removeEventListener("dateRangeChanged", dateHandler);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const user = await import("@/supabaseClient").then(m => m.supabase.auth.getUser());
      if (user?.data?.user) {
        setIsLoggedIn(true);
        const [cat, prod, ord] = await Promise.all([
          getCategories(),
          getProducts(),
          getOrders(),
        ]);
        setCategories(cat || []);
        setProducts(prod || []);
        setOrders(ord || []);
      } else {
        setIsLoggedIn(false);
        setCategories([]);
        setProducts([]);
        setOrders([]);
      }
    }
    fetchData();
    // Listen for signout event to clear dashboard data
    const clear = () => {
      setCategories([]);
      setProducts([]);
      setOrders([]);
    };
    window.addEventListener("clearOrders", clear);
    return () => window.removeEventListener("clearOrders", clear);
  }, [dateRange, refreshKey]);
  if (isLoggedIn === false) {
    return <div className="p-8 text-center text-gray-500">Please log in to view dashboard.</div>;
  }

  // Date helpers




  // Date filtering logic
  let from = null, to = null;
  const now = new Date();
  if (dateRange.value === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (dateRange.value === "week") {
    const day = now.getDay();
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (dateRange.value === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (dateRange.value === "year") {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
  } else if (dateRange.value === "custom" && dateRange.start && dateRange.end) {
    from = new Date(dateRange.start);
    to = new Date(dateRange.end);
    to.setDate(to.getDate() + 1); // include end date
  }

  // Filtered data
  const filteredOrders = from && to ? orders.filter((o) => {
    const created = new Date(o.created_at);
    return created >= from && created < to;
  }) : orders;
  const filteredProducts = from && to && products.length > 0 && "created_at" in products[0]
    ? (products as any[]).filter((p) => {
        const created = new Date(p.created_at);
        return created >= from && created < to;
      })
    : products;
 

  // Compute counts
  const totalProducts = filteredProducts.length;
  const activeProducts = filteredProducts.filter(p => p.ispublished !== false).length;
  const inactiveProducts = filteredProducts.filter(p => p.ispublished === false).length;
  // Show ALL categories, not filtered
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.is_published !== false).length;
  const inactiveCategories = categories.filter(c => c.is_published === false).length;
  const totalOrders = filteredOrders.length;
  // Orders: count only pending for badge
  const pendingOrdersCount = filteredOrders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
  const totalRevenue = filteredOrders.reduce(
    (sum, o) => sum + (o.totalprice || 0),
    0
  );
  // Calculate previous period for revenue comparison
  let prevFrom = null, prevTo = null, prevLabel = "Prev Range";
  if (from && to) {
    const diff = to.getTime() - from.getTime();
    prevFrom = new Date(from.getTime() - diff);
    prevTo = new Date(from.getTime());
    // Label for previous period
    if (dateRange.value === "today") prevLabel = "Prev Day";
    else if (dateRange.value === "week") prevLabel = "Prev Week";
    else if (dateRange.value === "month") prevLabel = "Prev Month";
    else if (dateRange.value === "year") prevLabel = "Prev Year";
  }
  const prevPeriodOrders = prevFrom && prevTo
    ? orders.filter((o) => {
        const created = new Date(o.created_at);
        return created >= prevFrom && created < prevTo;
      })
    : [];
  const prevPeriodRevenue = prevPeriodOrders.reduce(
    (sum, o) => sum + (o.totalprice || 0),
    0
  );
  const revenuePercentChange = prevPeriodRevenue === 0
    ? (totalRevenue === 0 ? 0 : 100)
    : ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100;
  // Order status counts (full string, correct for Confirmed/Cancelled)
  const orderStatusCounts: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const status = (o.status || '').toString();
    if (status) orderStatusCounts[status] = (orderStatusCounts[status] || 0) + 1;
  });

 

  // Recent orders (sortable)
  function handleRecentSort(col: 'id' | 'created_at' | 'totalprice' | 'status') {
    if (recentSortCol === col) {
      setRecentSortDir(recentSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setRecentSortCol(col);
      setRecentSortDir('asc');
    }
  }
  function getSortedRecentOrders() {
    let arr = [...filteredOrders];
    if (!recentSortCol) {
      arr = arr.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    } else {
      arr = arr.sort((a, b) => {
        let aVal = a[recentSortCol];
        let bVal = b[recentSortCol];
        if (recentSortCol === 'totalprice') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (recentSortCol === 'created_at') {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        }
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        if (aVal > bVal) return recentSortDir === 'asc' ? 1 : -1;
        return recentSortDir === 'asc' ? -1 : 1;
      });
    }
    return arr.slice(0, 5);
  }

  // Chart data (orders per day)
  const ordersByDay: { [date: string]: number } = {};
  filteredOrders.forEach((order) => {
    const date = order.created_at?.slice(0, 10);
    if (date) ordersByDay[date] = (ordersByDay[date] || 0) + 1;
  });
  const chartLabels = Object.keys(ordersByDay).sort();
  const chartData = chartLabels.map((date) => ordersByDay[date]);

  const chartDataset = chartLabels.map((date, i) => ({
    date: date.slice(5), // show MM-DD
    orders: chartData[i],
  }));

  // Compute user order counts using showOnOrders fields from branding config
  const userOrderMap: Record<string, { name: string; count: number }> = {};
  filteredOrders.forEach((order) => {
    let displayName = "Unknown";
    if (branding) {
      const checkoutSections = branding.checkoutSections || [];
      const showOnOrdersFields = checkoutSections.flatMap((section: any) =>
        (section.fields || []).filter((f: any) => f.showOnOrders)
      );
      const values = showOnOrdersFields
        .map((f: any) => order.checkoutdata?.[f.name])
        .filter((v: any) => v && String(v).trim() !== "");
      if (values.length > 0) {
        displayName = values.join(" | ");
      } else if (order.checkoutdata?.phone) {
        displayName = order.checkoutdata.phone;
      } else if (order.checkoutdata?.email) {
        displayName = order.checkoutdata.email;
      }
    } else {
      displayName = order.checkoutdata?.phone || order.id || "Unknown";
    }
    if (!userOrderMap[displayName]) {
      userOrderMap[displayName] = { name: displayName, count: 0 };
    }
    userOrderMap[displayName].count++;
  });
  const userOrderList = Object.values(userOrderMap).sort(
    (a, b) => b.count - a.count
  );

  return (
  <div className="p-2 md:p-6 space-y-4 md:space-y-8">
    {/* Top Stat Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {/* Products Card */}
        {/* Products Card */}
        <Card
          className="p-0 min-h-[160px] flex flex-col justify-between shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.025] hover:ring-2 hover:ring-green-200 dark:hover:ring-green-800 animate-fadein-slideup"
          style={{ animationDelay: '0ms' }}
          onClick={() => navigate("/products")}
        >
          <div className="flex items-center gap-4 p-5 pb-0">
            <div className="bg-gradient-to-tr from-green-400 to-green-600 dark:from-green-700 dark:to-green-900 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray-500 dark:text-green-200 text-sm font-medium">Products</div>
              <div className="text-3xl font-extrabold text-gray-800 dark:text-green-100 leading-tight">{totalProducts.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded-b-xl">
            <span className="text-green-700 dark:text-green-300 font-semibold">Active: {activeProducts}</span>
            <span className="text-gray-400 font-semibold">Inactive: {inactiveProducts}</span>
          </div>
        </Card>

        {/* Categories Card */}
        <Card
          className="p-0 min-h-[160px] flex flex-col justify-between shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.025] hover:ring-2 hover:ring-amber-200 dark:hover:ring-amber-800 animate-fadein-slideup"
          style={{ animationDelay: '80ms' }}
          onClick={() => navigate("/categories")}
        >
          <div className="flex items-center gap-4 p-5 pb-0">
            <div className="bg-gradient-to-tr from-yellow-400 to-amber-500 dark:from-yellow-700 dark:to-amber-900 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
              <Tag className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray-500 dark:text-amber-200 text-sm font-medium">Categories</div>
              <div className="text-3xl font-extrabold text-gray-800 dark:text-amber-100 leading-tight">{totalCategories.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded-b-xl">
            <span className="text-green-700 dark:text-green-300 font-semibold">Active: {activeCategories}</span>
            <span className="text-gray-400 font-semibold">Inactive: {inactiveCategories}</span>
          </div>
        </Card>

        {/* Orders Card */}
        <Card
          className="p-0 min-h-[160px] flex flex-col justify-between shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.025] hover:ring-2 hover:ring-orange-200 dark:hover:ring-orange-800 relative animate-fadein-slideup"
          style={{ animationDelay: '160ms' }}
          onClick={() => navigate("/orders")}
        >
          <div className="flex items-center gap-4 p-5 pb-0">
            <div className="bg-gradient-to-tr from-orange-400 to-orange-600 dark:from-orange-700 dark:to-orange-900 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray-500 dark:text-orange-200 text-sm font-medium flex flex-col gap-0.5">
                <span>Orders</span>
                <span className="text-xs lowercase text-green-600 dark:text-green-300 font-normal">({dateRange.label})</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-800 dark:text-orange-100 leading-tight">{totalOrders.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap px-5 pb-3 pt-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded-b-xl min-h-[32px]">
            {pendingOrdersCount > 0 && (
              <span
                className="inline-block bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 font-semibold rounded-full px-3 py-1 text-xs flex items-center gap-1 shadow-sm border border-yellow-200 dark:border-yellow-700 mb-1"
              >
                Pending Orders: <span className="font-mono text-xs ml-1">{pendingOrdersCount}</span>
              </span>
            )}
          </div>
        </Card>

        {/* Revenue Card */}
        <Card
          className="p-0 min-h-[160px] flex flex-col justify-between shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.025] hover:ring-2 hover:ring-lime-200 dark:hover:ring-lime-800 animate-fadein-slideup"
          style={{ animationDelay: '240ms' }}
          onClick={() => navigate("/orders")}
        >
          <div className="flex items-center gap-4 p-5 pb-0">
            <div className="bg-gradient-to-tr from-lime-400 to-lime-600 dark:from-lime-700 dark:to-lime-900 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-gray-500 dark:text-lime-200 text-sm font-medium">Revenue</div>
              <div className="text-3xl font-extrabold text-gray-800 dark:text-lime-100 leading-tight">₹{totalRevenue.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-2 text-xs bg-gray-50 dark:bg-zinc-800 rounded-b-xl min-h-[32px]">
            <span className="inline-block bg-lime-100 dark:bg-lime-800 text-lime-800 dark:text-lime-100 font-semibold rounded-full px-3 py-1 text-xs flex items-center gap-1 shadow-sm border border-lime-200 dark:border-lime-700">
              <span className="font-bold">{prevLabel}</span>
              <span className="mx-1">•</span>
              <span className="font-mono">₹{prevPeriodRevenue.toLocaleString()}</span>
            </span>
            <span
              className={
                revenuePercentChange >= 0
                  ? "text-green-600 font-semibold flex items-center gap-1"
                  : "text-red-600 font-semibold flex items-center gap-1"
              }
            >
              {revenuePercentChange === 0 && prevPeriodRevenue === 0 ? "-" : (revenuePercentChange === 100 ? "" : (revenuePercentChange >= 0 ? "▲" : "▼") + " " + Math.abs(revenuePercentChange).toFixed(1) + "%")}
            </span>
          </div>
        </Card>
      </div>

      {/* Recent Orders and Users/Order Count side by side */}
  <div className="grid grid-cols-1 md:grid-cols-1 gap-3 md:gap-6 mt-4 md:mt-6">
        {/* Recent Orders */}
  <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex flex-col justify-center border border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-300">
            Recent Orders
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-yellow-50 dark:bg-zinc-800 text-left text-gray-600 dark:text-gray-200">
                  <th className="p-3 font-semibold rounded-tl-xl cursor-pointer select-none" onClick={() => handleRecentSort('id')}>
                    Order ID {recentSortCol === 'id' && (recentSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-3 font-semibold cursor-pointer select-none" onClick={() => handleRecentSort('created_at')}>
                    Date {recentSortCol === 'created_at' && (recentSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-3 font-semibold cursor-pointer select-none" onClick={() => handleRecentSort('totalprice')}>
                    Total {recentSortCol === 'totalprice' && (recentSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-3 font-semibold rounded-tr-xl cursor-pointer select-none" onClick={() => handleRecentSort('status')}>
                    Status {recentSortCol === 'status' && (recentSortDir === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedRecentOrders().map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`transition cursor-pointer ${
                      idx % 2 === 0
                        ? "bg-gray-50 dark:bg-zinc-900"
                        : "bg-white dark:bg-zinc-800"
                    } hover:bg-green-50 dark:hover:bg-green-900 group`}
                    onClick={() =>
                      navigate("/orders", { state: { openOrderId: order.id } })
                    }
                    title="View order details"
                  >
                    <td className="p-3 font-semibold text-gray-800 dark:text-green-200 group-hover:text-green-700 dark:group-hover:text-green-300">{order.id}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">{order.created_at ? new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</td>
                    <td className="p-3 text-green-700 dark:text-green-300 font-bold">₹{order.totalprice}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${
                          order.status === "Delivered"
                            ? "bg-green-700 text-white border border-green-700"
                            : order.status === "Pending"
                            ? "bg-yellow-500 text-white border border-yellow-500"
                            : order.status === "Processing"
                            ? "bg-cyan-600 text-white border border-cyan-600"
                            : order.status === "Confirmed"
                            ? "bg-gray-500 text-white border border-gray-500"
                            : order.status === "Cancelled"
                            ? "bg-rose-700 text-white border border-rose-700"
                            : order.status === "Returned"
                            ? "bg-orange-500 text-white border border-orange-500"
                            : "bg-gray-300 text-white border border-gray-400"
                        }`}
                        style={{ minWidth: 80, textAlign: 'center', letterSpacing: 0.5 }}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>




      {/* Orders Per Day and Order Status Table Side by Side */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mt-4 md:mt-6">
        {/* Orders Per Day Chart */}
        <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 min-h-full h-full col-span-1">
          <h2 className="text-lg font-semibold mb-4 text-green-700">
            Orders Per Day
          </h2>
          {chartDataset.length === 0 ? (
            <div className="w-full text-center text-gray-400 flex items-center justify-center h-40">
              No data for chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={chartDataset}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#f0fdf4" }}
                  contentStyle={{
                    fontSize: "0.875rem",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="orders" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Table Card */}
        <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 min-h-full h-full col-span-1">
          <h2 className="text-lg font-semibold mb-4 text-orange-700 dark:text-orange-200 flex items-center gap-2">
            Order Statuses
            <span className="text-green-600 dark:text-green-300 font-semibold text-sm">({dateRange.label})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-orange-50 dark:bg-zinc-800 text-left text-gray-600 dark:text-gray-200">
                  <th className="p-3 font-semibold rounded-tl-xl">Status</th>
                  <th className="p-3 font-semibold rounded-tr-xl">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(orderStatusCounts).map(([status, count], idx) => (
                  <tr
                    key={status}
                    className={`transition ${idx % 2 === 0 ? "bg-gray-50 dark:bg-zinc-900" : "bg-white dark:bg-zinc-800"} hover:bg-orange-50 dark:hover:bg-orange-900 group`}
                  >
                    <td className="p-3 font-semibold text-gray-800 dark:text-orange-200 group-hover:text-orange-700 dark:group-hover:text-orange-300">
                      {status || "Unknown"}
                    </td>
                    <td className="p-3 text-orange-700 dark:text-orange-300 font-bold group-hover:text-orange-900 dark:group-hover:text-orange-100">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Users and Their Order Count Table Only */}
  <div className="grid grid-cols-1 gap-3 md:gap-6 mt-4 md:mt-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm p-6 flex flex-col justify-center">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            Users and Their Order Count
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50 dark:bg-zinc-800 text-left text-gray-600 dark:text-gray-200">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Order Count</th>
                </tr>
              </thead>
              <tbody>
                {userOrderList.map((user) => (
                  <tr
                    key={user.name}
                    className="border-b hover:bg-blue-50 dark:hover:bg-zinc-800 transition"
                  >
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
