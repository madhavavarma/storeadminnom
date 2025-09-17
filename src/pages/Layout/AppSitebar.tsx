
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, ShoppingCart, Package, Users, Tag, User as UserIcon } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { useSelector } from "react-redux";


export default function AppSidebar({ refreshKey }: { refreshKey: number }) {
  const logoUrl = useSelector((state: any) => state.AppSettings?.logoUrl);
  const siteTitle = useSelector((state: any) => state.AppSettings?.branding?.siteTitle);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  // Check auth on mount and on login/logout
  useEffect(() => {
    const checkAuth = async () => {
      const user = await supabase.auth.getUser();
      setIsLoggedIn(!!user?.data?.user);
    };
    checkAuth();
    // Listen for signout event to clear counts
    const clear = () => {
      setOrderCount(null);
      setCategoryCount(null);
      setCustomerCount(null);
      setIsLoggedIn(false);
    };
    window.addEventListener("clearOrders", clear);
    return () => window.removeEventListener("clearOrders", clear);
  }, [refreshKey]);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);

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
    // Listen for refreshSidebarCounts event to re-fetch counts after login
    const refresh = () => fetchCounts();
    window.addEventListener("refreshSidebarCounts", refresh);
    return () => {
      window.removeEventListener("dateRangeChanged", dateHandler);
      window.removeEventListener("refreshSidebarCounts", refresh);
    };
  }, []);

  // Always load once on mount and on dateRange change
  const fetchCounts = () => {
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
    // Orders count
    supabase.from("orders").select("id,created_at,userid", { count: "exact", head: false }).then(({ data }) => {
      let filtered = data || [];
      if (from && to) {
        filtered = filtered.filter((order: any) => {
          const created = new Date(order.created_at);
          return created >= from && created < to;
        });
      }
      setOrderCount(filtered.length);
      // Unique customers
      const unique = new Set(filtered.map((o: any) => o.userid));
      setCustomerCount(unique.size);
    });
    // Categories count (not date filtered)
    supabase.from("categories").select("id", { count: "exact", head: true }).then(({ count }) => setCategoryCount(count ?? 0));
  };

  useEffect(() => {
    fetchCounts();
  }, [dateRange, isLoggedIn]);

  // Only poll if liveUpdates is enabled
  useEffect(() => {
    const fetchCounts = () => {
      supabase.from("orders").select("id", { count: "exact", head: true }).then(({ count }) => setOrderCount(count ?? 0));
      supabase.from("categories").select("id", { count: "exact", head: true }).then(({ count }) => setCategoryCount(count ?? 0));
      supabase.from("orders").select("userid", { count: "exact", head: false }).then(({ data }) => {
        const unique = new Set((data || []).map((o: any) => o.userid));
        setCustomerCount(unique.size);
      });
    };
    const live = localStorage.getItem("liveUpdates");
    if (live === "false") return;
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Orders", url: "/orders", icon: ShoppingCart, badge: isLoggedIn ? orderCount : null },
    { title: "Products", url: "/products", icon: Package },
    { title: "Categories", url: "/categories", icon: Tag, badge: isLoggedIn ? categoryCount : null },
    { title: "Customers", url: "/customers", icon: Users, badge: isLoggedIn ? customerCount : null },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  // Sidebar content as a component for reuse
  function SidebarContent() {
    return (
      <div
        className={`h-screen ${collapsed ? "w-20" : "w-64"} bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 flex flex-col shadow-lg border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300`}
      >
        {/* Top Section (Company / Logo + collapse button) */}
        {/* Top Section (Logo/title + collapse/expand button) */}
        {collapsed ? (
          <div className="flex flex-col items-center justify-center py-3 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 w-10 h-10 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-green-100 dark:hover:bg-green-900 shadow-md transition-colors text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Expand sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center">
              {logoUrl && (
                <>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-10 h-10 object-contain rounded-full bg-white border border-zinc-200 dark:border-zinc-700 shadow"
                  />
                  {siteTitle && (
                    <span className="ml-3 font-bold text-lg truncate max-w-[140px] dark:text-white text-gray-900 align-middle">{siteTitle}</span>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {/* Collapse button (always visible) */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-2 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-green-100 dark:hover:bg-green-900 shadow-md transition-colors text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Collapse sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Close button for mobile overlay */}
              <button
                className="md:hidden p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm transition-colors text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Determine active by matching the current path
            const active = location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium group transition-all
                  ${collapsed ? "justify-center" : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200"}
                  ${active ? "bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 font-semibold" : ""}
                `}
              >
                <span className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md transition-all 
                  ${active ? "bg-gradient-to-tr from-green-400 to-green-600 dark:from-green-700 dark:to-green-900" : "bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 group-hover:from-green-100 group-hover:to-green-200 dark:group-hover:from-green-900 dark:group-hover:to-green-800"}`}>
                  <Icon
                    className={`w-5 h-5 ${active ? "text-white" : "text-gray-500 group-hover:text-green-700 dark:text-gray-300 dark:group-hover:text-white"}`}
                  />
                </span>
                {!collapsed && <span className="transition-colors duration-200">{item.title}</span>}
                {/* Badge for specific menu items */}
                {!collapsed && item.badge !== undefined && item.badge !== null && (
                  <span
                    className="ml-auto min-w-[20px] px-2 py-0.5 text-[11px] font-semibold 
                              bg-red-500 text-white rounded flex items-center justify-center 
                              shadow-sm tracking-tight"
                  >
                    {item.badge}
                  </span>
                )}
                {/* Tooltip for collapsed */}
                {collapsed && (
                  <span
                    className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md 
                    opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10"
                  >
                    {item.title}
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="ml-2 bg-red-500 text-white rounded-full px-2 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
          </nav>

          {/* Bottom Profile */}
          <SidebarUser collapsed={collapsed} />
        </div>
      );
    }

// SidebarUser component for user info and avatar
function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
  }, []);
  const name = user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "User");
  const email = user?.email || "";
  return (
    <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 via-blue-400 to-purple-400 flex items-center justify-center shadow-md animate-pulse">
        <UserIcon className="w-6 h-6 text-white" />
      </span>
      {!collapsed && (
        <div>
          <p className="text-sm font-semibold truncate max-w-[120px]">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{email}</p>
        </div>
      )}
    </div>
  );
}

    // Responsive rendering
    return (
      <>

        {/* Hamburger button for mobile (always visible if overlay not open) */}
        {!isMobileOpen && (
          <button
            className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow-lg border border-gray-200"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          </button>
        )}


        {/* Sidebar overlay for mobile */}
        {isMobileOpen ? (
          <div className="fixed inset-0 z-40 flex">
            {/* Overlay background */}
            <div
              className="fixed inset-0 bg-black/40 transition-opacity"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close sidebar overlay"
            />
            {/* Sidebar slides in from left */}
            <div className="relative z-50">
              <SidebarContent />
            </div>
          </div>
        ) : (
          // Bottom navigation bar for mobile
          <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex justify-around items-center bg-white/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-t-2xl py-2 px-1 backdrop-blur-lg">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.url);
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`relative flex flex-col items-center justify-center px-2 py-1 rounded-lg group transition-all ${active ? "bg-green-50 dark:bg-green-900" : "hover:bg-gray-100 dark:hover:bg-zinc-800"}`}
                  style={{ minWidth: 48 }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className={`w-9 h-9 flex items-center justify-center rounded-lg shadow-md transition-all 
                      ${active ? "bg-gradient-to-tr from-green-400 to-green-600 dark:from-green-700 dark:to-green-900" : "bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 group-hover:from-green-100 group-hover:to-green-200 dark:group-hover:from-green-900 dark:group-hover:to-green-800"}`}>
                      <Icon className={`w-6 h-6 mb-0.5 ${active ? "text-white" : "text-gray-500 group-hover:text-green-700 dark:text-gray-300 dark:group-hover:text-white"}`} />
                    </span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 font-bold shadow border-2 border-white dark:border-zinc-900">{item.badge}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium mt-0.5 text-gray-600 dark:text-gray-300">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Sidebar for desktop */}
        <div className="hidden md:flex">
          <SidebarContent />
        </div>
      </>
    );
}
