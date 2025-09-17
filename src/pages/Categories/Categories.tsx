import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ICategory } from "@/interfaces/ICategory"
import { getCategories } from "../api"
import AddCategoryDrawer from "./AddCategoryDrawer"
import EditCategoryDrawer from "./EditCategoryDrawer"
import { supabase } from "@/supabaseClient"


export default function Categories({ refreshKey: parentRefreshKey }: { refreshKey: number }) {
  const [viewMode, setViewMode] = useState<'card'|'table'>('table');
  useEffect(() => {
    const onResize = () => setViewMode(window.innerWidth < 768 ? 'card' : 'table');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ICategory | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [sortCol] = useState<keyof ICategory | null>(null);
  const [sortDir] = useState<'asc' | 'desc'>('asc');
  const perPage = 6;
  const totalPages = Math.ceil(categories.length / perPage);


  function getSortedCategories() {
    if (!sortCol) return categories;
    const sorted = [...categories].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      // Boolean sort for is_published
      if (sortCol === 'is_published') {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return sortDir === 'asc' ? -1 : 1;
    });
    return sorted;
  }

  useEffect(() => {
    setLoading(true);
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setIsLoggedIn(true);
        getCategories()
          .then((data) => {
            setCategories(data || []);
            setLoading(false);
          })
          .catch(() => {
            setError("Failed to load categories");
            setLoading(false);
          });
      } else {
        setIsLoggedIn(false);
        setCategories([]);
        setLoading(false);
      }
    });
    // Listen for signout event to clear categories
    const clear = () => setCategories([]);
    window.addEventListener("clearOrders", clear);
    return () => window.removeEventListener("clearOrders", clear);
  }, [refreshKey, drawerOpen, parentRefreshKey]);

  const filtered = categories.filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleRowClick = (category: ICategory) => {
    setSelectedCategory(category);
    setEditDrawerOpen(true);
  };

  // Toggle published status
  const setPublished = async (cat: ICategory, publish: boolean) => {
    await supabase.from('categories').update({ is_published: publish }).eq('id', cat.id);
    setCategories((prev) => prev.map(c => c.id === cat.id ? { ...c, is_published: publish } : c));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <svg className="animate-spin h-8 w-8 text-green-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-green-700 font-medium text-lg">Loading categories...</span>
      </div>
    );
  }
  if (isLoggedIn === false) {
    return <div className="p-8 text-center text-gray-500">Please log in to view categories.</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  return (
    <div className="p-2 md:p-4 space-y-4 md:space-y-6 pb-24 md:pb-0">
      {/* Search and Add Button Row */}
      <div className="flex items-center gap-2 mb-2">
        <Input placeholder="Search categories..." value={query} onChange={e => { setQuery(e.target.value); setCurrentPage(1); }} className="flex-1" />
        <Button onClick={() => setDrawerOpen(true)} className="bg-green-600 text-white">Add</Button>
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
                <th className="p-3 font-medium">Category</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getSortedCategories().slice((currentPage - 1) * perPage, currentPage * perPage).map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b hover:bg-green-50 dark:hover:bg-zinc-800 cursor-pointer transition"
                  onClick={() => handleRowClick(cat)}
                >
                  {/* Category cell: image + name */}
                  <td className="p-3 align-top">
                    <div className="flex items-center gap-3">
                      <img src={cat.image_url || "/vite.svg"} alt={cat.name} className="h-12 w-12 rounded-md object-cover" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm tracking-wide">{cat.name}</span>
                    </div>
                  </td>
                  {/* Actions: Publish/Unpublish button (like Products) */}
                  <td className="p-3 align-top" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {cat.is_published ? (
                        <Button size="sm" className="bg-red-600 text-white flex items-center gap-1" onClick={e => { e.stopPropagation(); setPublished(cat, false); }}>
                          <EyeOff size={16} />
                          <span className="hidden xs:inline">Unpublish</span>
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-green-600 text-white flex items-center gap-1" onClick={e => { e.stopPropagation(); setPublished(cat, true); }}>
                          <Eye size={16} />
                          <span className="hidden xs:inline">Publish</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="flex flex-col gap-3 pb-6">
          {paginated.map((cat, idx) => (
            <div
              key={cat.id}
              className="rounded-xl shadow-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg transition animate-fadein-slideup min-h-[120px] w-full"
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => handleRowClick(cat)}
            >
              <div className="flex flex-row items-center w-full mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate max-w-[70%]">{cat.name}</span>
              </div>
              <div className="flex flex-row items-center gap-3 w-full">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="h-12 w-12 object-contain rounded-xl border border-green-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm"
                />
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${cat.is_published ? 'bg-green-600 text-white border border-green-600' : 'bg-rose-600 text-white border border-rose-600'}`}>{cat.is_published ? 'Published' : 'Unpublished'}</span>
                {cat.is_published ? (
                  <Button size="sm" className="bg-red-600 text-white flex items-center gap-1 ml-auto" onClick={e => { e.stopPropagation(); setPublished(cat, false); }}>
                    <EyeOff size={16} />
                    <span className="hidden xs:inline">Unpublish</span>
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600 text-white flex items-center gap-1 ml-auto" onClick={e => { e.stopPropagation(); setPublished(cat, true); }}>
                    <Eye size={16} />
                    <span className="hidden xs:inline">Publish</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Pagination */}
        {/* Pagination */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
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
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md"
            >
              Next <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-xl p-4">
        {/* Categories List and Table/Card UI ...existing code... */}
        {/* ...existing code for table, mobile cards, pagination... */}
        <AddCategoryDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAdd={async (data) => {
            await supabase.from("categories").insert([data]);
            setDrawerOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
        <EditCategoryDrawer
          open={editDrawerOpen}
          onClose={() => setEditDrawerOpen(false)}
          category={selectedCategory}
          onUpdate={async (data) => {
            if (!data.id) return;
            const { id, ...rest } = data;
            // If image_url is different from selectedCategory.image_url, delete old image
            if (selectedCategory && data.image_url && data.image_url !== selectedCategory.image_url && selectedCategory.image_url) {
              const splitStr = '/object/public/storeadmin/';
              const idx = selectedCategory.image_url.indexOf(splitStr);
              let path = '';
              if (idx !== -1) {
                path = selectedCategory.image_url.substring(idx + splitStr.length);
                await supabase.storage.from('storeadmin').remove([path]);
              }
            }
            await supabase.from("categories").update(rest).eq("id", id);
            setEditDrawerOpen(false);
            setSelectedCategory(null);
            setRefreshKey((k) => k + 1);
          }}
          onDelete={async (id, image_url) => {
            // Remove category reference from products
            const cat = categories.find(c => c.id === id);
            if (cat) {
              await supabase.from("products").update({ category: "" }).eq("category", cat.name);
            }
            await supabase.from("categories").delete().eq("id", id);
            // Remove image from storage if present
            if (image_url) {
              const splitStr = '/object/public/storeadmin/';
              const idx = image_url.indexOf(splitStr);
              let path = '';
              if (idx !== -1) {
                path = image_url.substring(idx + splitStr.length);
                await supabase.storage.from('storeadmin').remove([path]);
              }
            }
            setEditDrawerOpen(false);
            setSelectedCategory(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      </div>
    </div>
  );
}
