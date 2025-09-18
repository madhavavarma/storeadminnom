import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Users } from "lucide-react";
// ...existing code...
import { Input } from "@/components/ui/input";

interface Customer {
  userid: string;
  first_order: string;
  orders: number;
  total_spent: number;
}

interface Order {
  id: string;
  created_at: string;
  totalprice: number;
  status: string;
}

interface CustomersProps {
  refreshKey?: number;
}

export default function Customers({ refreshKey }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortCol, setSortCol] = useState<keyof Customer | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<'card'|'table'>('table');
  const perPage = 6;
  // Drawer state and handler
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const navigate = useNavigate();

  // Handler to open drawer and load customer orders
  // ...existing code...

  // Sorting logic
  function handleSort(col: keyof Customer) {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function getSortedCustomers() {
    if (!sortCol) return customers;
    const sorted = [...customers].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      // Numeric sort for orders and total_spent
      if (sortCol === 'orders' || sortCol === 'total_spent') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      // Date sort for first_order
      if (sortCol === 'first_order') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return sortDir === 'asc' ? -1 : 1;
    });
    return sorted;
  }

  // Live update state
  const [liveUpdates, setLiveUpdates] = useState(() => {
    const stored = localStorage.getItem("liveUpdates");
    return stored === null ? true : stored === "true";
  });
  // Date range state
  const [dateRange, setDateRange] = useState(() => {
    const stored = localStorage.getItem("dateRange");
    return stored ? JSON.parse(stored) : { label: "Today", value: "today", start: null, end: null };
  });
  useEffect(() => {
    const liveHandler = () => {
      const stored = localStorage.getItem("liveUpdates");
      setLiveUpdates(stored === null ? true : stored === "true");
    };
    const dateHandler = () => {
      const stored = localStorage.getItem("dateRange");
      setDateRange(stored ? JSON.parse(stored) : { label: "Today", value: "today", start: null, end: null });
    };
    window.addEventListener("liveUpdatesChanged", liveHandler);
    window.addEventListener("dateRangeChanged", dateHandler);
    // Listen for signout event to clear customers
    const clear = () => setCustomers([]);
    window.addEventListener("clearOrders", clear);
    return () => {
      window.removeEventListener("liveUpdatesChanged", liveHandler);
      window.removeEventListener("dateRangeChanged", dateHandler);
      window.removeEventListener("clearOrders", clear);
    };
  }, [refreshKey]);

  // Always load once on mount and on dateRange change
  useEffect(() => {
    setLoading(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (data?.user) {
        setIsLoggedIn(true);
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id,userid,created_at,totalprice,status");
        if (ordersError) {
          setError("Failed to load orders");
          setLoading(false);
          return;
        }
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
        const filteredOrders = (ordersData || []).filter((order: any) => {
          if (!from || !to) return true;
          const created = new Date(order.created_at);
          return created >= from && created < to;
        });
        const customerMap: { [userid: string]: Customer } = {};
        filteredOrders.forEach((order: any) => {
          if (!customerMap[order.userid]) {
            customerMap[order.userid] = {
              userid: order.userid,
              first_order: order.created_at,
              orders: 1,
              total_spent: order.totalprice || 0,
            };
          } else {
            customerMap[order.userid].orders += 1;
            customerMap[order.userid].total_spent += order.totalprice || 0;
            if (new Date(order.created_at) < new Date(customerMap[order.userid].first_order)) {
              customerMap[order.userid].first_order = order.created_at;
            }
          }
        });
        setCustomers(Object.values(customerMap));
        setLoading(false);
      } else {
        setIsLoggedIn(false);
        setCustomers([]);
        setLoading(false);
      }
    });
  }, [dateRange]);

  // Only poll if liveUpdates is enabled
  useEffect(() => {
    if (!liveUpdates) return;
    const interval = setInterval(() => {
      setLoading(true);
      supabase.auth.getUser().then(async ({ data }) => {
        if (data?.user) {
          setIsLoggedIn(true);
          const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select("id,userid,created_at,totalprice,status");
          if (ordersError) {
            setError("Failed to load orders");
            setLoading(false);
            return;
          }
          const customerMap: { [userid: string]: Customer } = {};
          (ordersData || []).forEach((order: any) => {
            if (!customerMap[order.userid]) {
              customerMap[order.userid] = {
                userid: order.userid,
                first_order: order.created_at,
                orders: 1,
                total_spent: order.totalprice || 0,
              };
            } else {
              customerMap[order.userid].orders += 1;
              customerMap[order.userid].total_spent += order.totalprice || 0;
              if (new Date(order.created_at) < new Date(customerMap[order.userid].first_order)) {
                customerMap[order.userid].first_order = order.created_at;
              }
            }
          });
          setCustomers(Object.values(customerMap));
          setLoading(false);
        } else {
          setIsLoggedIn(false);
          setCustomers([]);
          setLoading(false);
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [liveUpdates]);

  const handleUserClick = async (customer: Customer) => {
    setSelectedUser(customer);
    setDrawerOpen(true);
    setOrdersLoading(true);
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("id,created_at,totalprice,status")
      .eq("userid", customer.userid)
      .order("created_at", { ascending: false });
    setUserOrders(error ? [] : (ordersData as Order[]));
    setOrdersLoading(false);
  };

  // Filter customers by search query
  const filtered = customers.filter(c => (c.userid || "").toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <svg className="animate-spin h-8 w-8 text-green-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-green-700 font-medium text-lg">Loading customers...</span>
      </div>
    );
  }
  if (isLoggedIn === false) {
    return <div className="p-8 text-center text-gray-500">Please log in to view customers.</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // Place search input at the very top, before any other content
  return (
    <div className="p-2 md:p-4 space-y-4 md:space-y-6 pb-24 md:pb-0">
      {/* Search and Add Button Row */}
      <div className="flex items-center gap-2 mb-2">
        <Input placeholder="Search customers..." value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1); }} className="flex-1" />
        <Button className="bg-green-600 text-white" onClick={() => alert('Add customer functionality coming soon!')}>Add</Button>
      </div>
      {/* Card/Table View Switch Row (right-aligned, mobile only) */}
      <div className="flex justify-end md:hidden mb-2">
        <div className="flex">
          <button
            className={`px-3 py-1 rounded-l-lg border border-r-0 text-xs font-semibold transition-all ${viewMode === 'card' ? 'bg-green-600 text-white' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setViewMode('card')}
          >
            Card View
          </button>
          <button
            className={`px-3 py-1 rounded-r-lg border text-xs font-semibold transition-all ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setViewMode('table')}
          >
            Table View
          </button>
        </div>
      </div>
  {/* Table View */}
  {(viewMode === 'table' || window.innerWidth >= 768) && (
        <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-xl border border-gray-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm border-collapse rounded-xl shadow-md overflow-hidden bg-white dark:bg-zinc-900">
            <thead>
              <tr className="bg-green-50 dark:bg-zinc-800 text-left text-gray-600 dark:text-gray-200">
                <th className="p-3 font-medium cursor-pointer select-none" onClick={() => handleSort('userid')}>
                  User ID {sortCol === 'userid' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 font-medium cursor-pointer select-none" onClick={() => handleSort('first_order')}>
                  First Order {sortCol === 'first_order' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 font-medium cursor-pointer select-none" onClick={() => handleSort('orders')}>
                  Orders {sortCol === 'orders' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 font-medium cursor-pointer select-none" onClick={() => handleSort('total_spent')}>
                  Total Spent {sortCol === 'total_spent' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedCustomers().slice((currentPage - 1) * perPage, currentPage * perPage).map((customer, idx) => (
                <tr
                  key={customer.userid}
                  className={`border-b hover:bg-green-50 dark:hover:bg-zinc-800 cursor-pointer transition ${
                    idx % 2 === 0
                      ? "bg-white dark:bg-zinc-900"
                      : "bg-green-50 dark:bg-zinc-900"
                  }`}
                  onClick={() => handleUserClick(customer)}
                >
                  <td className="p-3 font-medium text-gray-700 dark:text-green-200">{customer.userid}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{customer.first_order ? new Date(customer.first_order).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{customer.orders}</td>
                  <td className="p-3 text-green-700 dark:text-green-300 font-bold">₹{customer.total_spent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
  {/* Card View */}
  {viewMode === 'card' && (
        <div className="flex flex-col gap-3 pb-6">
          {paginated.map((customer, idx) => (
            <div
              key={customer.userid}
              className="rounded-xl shadow-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg transition animate-fadein-slideup min-h-[120px] w-full"
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => handleUserClick(customer)}
            >
              <div className="flex flex-row items-center w-full mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate max-w-[70%]">{customer.userid}</span>
              </div>
              <div className="flex flex-row items-center gap-3 w-full">
                <div className="bg-gradient-to-tr from-blue-400 to-blue-600 dark:from-blue-700 dark:to-blue-900 rounded-full p-2 flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all bg-green-600 text-white border border-green-600">Orders: {customer.orders}</span>
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all bg-blue-600 text-white border border-blue-600">₹{customer.total_spent.toLocaleString()}</span>
                <span className="ml-auto text-xs text-gray-500">First Order: {customer.first_order ? new Date(customer.first_order).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-md"
          >
            <ChevronLeft size={16} /> Previous
          </Button>
          <span className="px-3 text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md"
          >
            Next <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      {/* Customer Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="p-0 w-full max-w-md flex flex-col h-full bg-gray-50 dark:bg-zinc-900">
          <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-gray-200 dark:border-zinc-800">
            <div className="text-xl font-bold text-green-700 dark:text-green-200">Customer Details</div>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-zinc-700"
              type="button"
              onClick={() => setDrawerOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </Button>
          </div>
          <div className="flex flex-col gap-8 h-full px-6 py-6">
            {selectedUser && (
              <Card className="p-6 bg-green-50/70 border border-green-100 rounded-xl shadow-sm">
                <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <p className="text-sm font-medium text-gray-800 break-all">{selectedUser.userid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">First Order</p>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(selectedUser.first_order).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Orders</p>
                    <p className="text-base font-semibold text-green-700">{selectedUser.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                    <p className="text-base font-semibold text-green-700">
                      ₹{selectedUser.total_spent.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            )}
            <div>
              <div className="font-semibold text-md mb-3">Orders</div>
              {ordersLoading ? (
                <div className="text-gray-500">Loading orders...</div>
              ) : userOrders.length === 0 ? (
                <div className="text-gray-400 italic">No orders found for this customer.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {userOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="p-4 border rounded-lg shadow-sm hover:bg-green-50 cursor-pointer transition"
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate("/orders", { state: { openOrderId: order.id } });
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-green-700">Order #{order.id}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{order.totalprice.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">{order.status}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
