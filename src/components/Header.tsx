

import { Sun, Moon, User, Bell, LogOut, RefreshCcw, CalendarDays } from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store/Store";
import { toggleTheme, setUser } from "@/store/HeaderSlice";

import { useEffect, useState } from "react";


import { supabase } from "@/supabaseClient";

import AuthDrawer from "@/pages/Auth/AuthDrawer";



// export default function Header() {
export default function Header({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.header.theme);
  const user = useSelector((state: RootState) => state.header.user);

  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);

  // Live update toggle state
  const [liveUpdates, setLiveUpdates] = useState(() => {
    const stored = localStorage.getItem("liveUpdates");
    return stored === null ? true : stored === "true";
  });

  // Date range state
  const defaultRange = { label: "Today", value: "today", start: null, end: null };
  const [dateRange, setDateRange] = useState(() => {
    const stored = localStorage.getItem("dateRange");
    return stored ? JSON.parse(stored) : defaultRange;
  });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Broadcast date range changes
  useEffect(() => {
    localStorage.setItem("dateRange", JSON.stringify(dateRange));
    window.dispatchEvent(new CustomEvent("dateRangeChanged", { detail: dateRange }));
  }, [dateRange]);

  // Sync localStorage and broadcast event
  useEffect(() => {
    localStorage.setItem("liveUpdates", String(liveUpdates));
    window.dispatchEvent(new CustomEvent("liveUpdatesChanged", { detail: { enabled: liveUpdates } }));
  }, [liveUpdates]);


  // Add or remove dark mode class on html element
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  // Sidebar header: className="flex items-center justify-between p-4 border-b border-gray-200"
  // On mount, check for Supabase user and update Redux user state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        dispatch(setUser({ name: data.user.email || "User" }));
      } else {
        dispatch(setUser({ name: "" }));
      }
    });
  }, []);

  // After sign-in, update Redux user state
  const handleAuthSuccess = () => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        dispatch(setUser({ name: data.user.email || "User" }));
      }
    });
    window.dispatchEvent(new Event("refreshSidebarCounts"));
    if (onAuthSuccess) onAuthSuccess();
  };

  // On sign out, clear user and orders
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    dispatch(setUser({ name: "" }));
    // Clear orders in OrdersSlice
    const event = new CustomEvent('clearOrders');
    window.dispatchEvent(event);
    window.dispatchEvent(new Event("refreshSidebarCounts"));
  };

  return (
    <>
      <header className="w-full flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900" style={{ minHeight: 64 }}>
        <div className="flex-1"></div>
  <div className="flex items-center gap-2">
          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-md border-none bg-gradient-to-tr from-green-400 to-green-600 dark:from-green-700 dark:to-green-900 text-white shadow-md hover:from-green-500 hover:to-green-700 dark:hover:from-green-800 dark:hover:to-green-950 transition"
              title="Select date range"
              tabIndex={0}
              onClick={() => {
                const menu = document.getElementById("date-range-menu");
                if (menu) menu.classList.toggle("hidden");
              }}
            >
              <CalendarDays className="w-5 h-5 text-white" />
              <span className="hidden md:inline text-white font-semibold">{dateRange.label}</span>
            </button>
            <div
              id="date-range-menu"
              className="hidden absolute z-50 mt-2 w-56 right-0 md:left-auto left-0 bg-white dark:bg-neutral-900 border border-zinc-200 dark:border-green-900 rounded-md shadow-lg p-2 text-zinc-800 dark:text-green-200"
              tabIndex={-1}
            >
              {[ 
                { label: "Today", value: "today" },
                { label: "This Week", value: "week" },
                { label: "This Month", value: "month" },
                { label: "This Year", value: "year" },
                { label: "Custom Range", value: "custom" },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`w-full text-left px-3 py-2 rounded bg-transparent hover:bg-zinc-100 dark:hover:bg-green-950 ${dateRange.value === opt.value ? "bg-zinc-100 dark:bg-green-900 font-semibold" : ""}`}
                  onClick={() => {
                    if (opt.value !== "custom") {
                      setDateRange({ label: opt.label, value: opt.value, start: null, end: null });
                      document.getElementById("date-range-menu")?.classList.add("hidden");
                    } else {
                      setDateRange({ label: opt.label, value: opt.value, start: null, end: null });
                      // Do NOT close the menu, show the date pickers
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
              {/* Custom Range Picker */}
              {dateRange.value === "custom" && (
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs text-zinc-500">Start Date</label>
                  <input
                    type="date"
                    className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                  />
                  <label className="text-xs text-zinc-500">End Date</label>
                  <input
                    type="date"
                    className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                  />
                  <button
                    className="mt-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    onClick={() => {
                      if (customStart && customEnd) {
                        setDateRange({ label: `Custom: ${customStart} to ${customEnd}`, value: "custom", start: customStart, end: customEnd });
                        document.getElementById("date-range-menu")?.classList.add("hidden");
                      }
                    }}
                  >Apply</button>
                </div>
              )}
            </div>
          </div>
          {/* Live update toggle */}
          <button
            className={`p-2 rounded-full transition shadow-md ${liveUpdates ? "bg-gradient-to-tr from-blue-400 to-blue-600 dark:from-blue-700 dark:to-blue-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
            title={liveUpdates ? "Live updates ON" : "Live updates OFF"}
            onClick={() => setLiveUpdates((v) => !v)}
          >
            <RefreshCcw className={`w-5 h-5 ${liveUpdates ? "text-white animate-spin-slow" : "text-zinc-500 dark:text-zinc-300"}`} />
          </button>
          <button
            className={`p-2 rounded-full shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition group ${theme === "dark" ? "bg-gradient-to-tr from-yellow-400 to-yellow-600 dark:from-yellow-700 dark:to-yellow-900" : "bg-zinc-100 dark:bg-zinc-800"}`}
            onClick={() => dispatch(toggleTheme())}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <Sun className="w-5 h-5 text-white group-hover:text-yellow-200" />
              : <Moon className="w-5 h-5 text-zinc-500 dark:text-zinc-300 group-hover:text-green-600" />}
          </button>
          <button className={`p-2 rounded-full shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition group ${false ? "bg-gradient-to-tr from-pink-400 to-pink-600 dark:from-pink-700 dark:to-pink-900" : "bg-zinc-100 dark:bg-zinc-800"}`} title="Notifications">
            <Bell className="w-5 h-5 text-zinc-500 dark:text-zinc-300 group-hover:text-pink-500" />
          </button>
          {user?.name ? (
            <button
              className="flex items-center gap-2 p-2 rounded-full bg-gradient-to-tr from-red-400 to-red-600 dark:from-red-700 dark:to-red-900 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition group"
              title="Sign Out"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 text-white" />
              <span className="text-sm text-white">Sign Out</span>
            </button>
          ) : (
            <button
              className="flex items-center gap-2 p-2 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 dark:from-blue-700 dark:to-blue-900 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition group"
              title="User"
              onClick={() => setAuthDrawerOpen(true)}
            >
              <User className="w-5 h-5 text-white" />
              <span className="text-sm text-white">{user?.name || "User"}</span>
            </button>
          )}
        </div>
      </header>
  <AuthDrawer open={authDrawerOpen} onClose={() => setAuthDrawerOpen(false)} onAuthSuccess={handleAuthSuccess} />
    </>
  );
}
