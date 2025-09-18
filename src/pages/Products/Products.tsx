import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AddProductDrawer from "./AddProductDrawer";
import EditProductDrawer from "./EditProductDrawer";
import type { IProduct } from "@/interfaces/IProduct";


interface ProductRow {
  id: number;
  name: string;
  ispublished?: boolean;
  price: number;
  imageUrls?: string[];
  orderCount?: number;
}

export default function Products() {
  // Card/Table view switch (like Orders)
  const [viewMode, setViewMode] = useState<'card'|'table'>('table');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number|null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<IProduct | null>(null);

  
    // Update product and all related data in Supabase
    async function handleUpdateProduct(data: Partial<IProduct>) {
      if (!data.id) return;
      // Update main product
      await supabase.from("products").update({
        name: data.name,
        price: data.price,
        category: data.category,
        labels: data.labels,
        ispublished: data.ispublished,
        discount: data.discount,
        tax: data.tax,
  shortdescription: data.shortdescription ?? null,
      }).eq("id", data.id);
  
      // Remove and re-insert images
      await supabase.from("productimages").delete().eq("productid", data.id);
      if (data.imageUrls && data.imageUrls.length > 0) {
        for (const url of data.imageUrls) {
          await supabase.from("productimages").insert({ productid: data.id, url });
        }
      }
  
      // Remove and re-insert descriptions
      await supabase.from("productdescriptions").delete().eq("productid", data.id);
      if (data.productdescriptions && data.productdescriptions.length > 0) {
        for (const desc of data.productdescriptions) {
          await supabase.from("productdescriptions").insert({
            productid: data.id,
            title: desc.title,
            content: desc.content,
          });
        }
      }
  
      // Remove and re-insert variants and options
      const { data: oldVariants } = await supabase.from("productvariants").select("id").eq("productid", data.id);
      if (oldVariants && oldVariants.length > 0) {
        for (const v of oldVariants) {
          await supabase.from("productvariantoptions").delete().eq("variantid", v.id);
        }
        await supabase.from("productvariants").delete().eq("productid", data.id);
      }
      if (data.productvariants && data.productvariants.length > 0) {
        for (const variant of data.productvariants) {
          const { id, ...variantInsert } = variant;
          const { data: variantRow } = await supabase.from("productvariants").insert({
            productid: data.id,
            name: variantInsert.name,
            ispublished: variantInsert.ispublished,
          }).select().single();
          if (variantRow && variant.productvariantoptions && variant.productvariantoptions.length > 0) {
            for (const option of variant.productvariantoptions) {
              const { id: optId, ...optionInsert } = option;
              await supabase.from("productvariantoptions").insert({
                variantid: variantRow.id,
                name: optionInsert.name,
                price: optionInsert.price,
                ispublished: optionInsert.ispublished,
                isoutofstock: optionInsert.isoutofstock,
                isdefault: optionInsert.isdefault,
              });
            }
          }
        }
      }
  
      // Reload the product with relations to ensure UI is up to date
      const { data: fullProduct } = await supabase
        .from("products")
        .select(`*, productimages(url), productdescriptions(*), productvariants(*, productvariantoptions(*))`)
        .eq("id", data.id)
        .single();
      setProducts((prev) => prev.map((p) => p.id === data.id ? {
        ...fullProduct,
        imageUrls: (fullProduct?.productimages || []).map((img: any) => img.url),
        productdescriptions: fullProduct.productdescriptions || [],
        productvariants: (fullProduct.productvariants || []).map((v: any) => ({
          ...v,
          productvariantoptions: v.productvariantoptions || []
        })),
      } : p));
      setEditOpen(false);
    }

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true);
      // Fetch products
      const { data: productData } = await supabase.from("products").select("*");
      // Fetch product images
      const { data: imagesData } = await supabase.from("productimages").select("productid,url");
      // Fetch order items to compute order counts
      const { data: itemsData } = await supabase.from("order_items").select("product,quantity");

      const imagesByProduct: Record<number, string[]> = {};
      (imagesData || []).forEach((img: any) => {
        const pid = Number(img.productid);
        if (!imagesByProduct[pid]) imagesByProduct[pid] = [];
        imagesByProduct[pid].push(img.url);
      });

      // compute counts
      const counts: Record<number, number> = {};
      (itemsData || []).forEach((it: any) => {
        const prod = it.product || {};
        const pid = Number(prod.id ?? prod.productid ?? prod.product_id ?? 0);
        if (!pid) return;
        counts[pid] = (counts[pid] || 0) + (it.quantity || 1);
      });

      const rows: ProductRow[] = (productData || []).map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        ispublished: p.ispublished,
        price: Number(p.price || 0),
        imageUrls: imagesByProduct[Number(p.id)] || [],
      }));

      if (!mounted) return;
      setProducts(rows);
      setLoading(false);
    }
    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  async function setPublished(productId: number, publish: boolean) {
    try {
      const { error } = await supabase.from('products').update({ ispublished: publish }).eq('id', productId);
      if (error) {
        console.error(publish ? 'Publish failed' : 'Unpublish failed', error);
        return;
      }
      setProducts((prev) => prev.map(p => p.id === productId ? { ...p, ispublished: publish } : p));
    } catch (err) {
      console.error('Error updating publish status:', err);
    }
  }

  async function handleAddProduct(data: Partial<IProduct>) {
    // Insert product into Supabase
    const { data: inserted, error } = await supabase.from("products").insert({
      name: data.name,
      price: data.price,
      category: data.category,
      labels: data.labels,
      ispublished: data.ispublished,
      discount: data.discount,
      tax: data.tax,
  shortdescription: data.shortdescription ?? null,
    }).select().single();
    if (error) {
      alert("Error adding product: " + error.message);
      return;
    }
    // Insert images if present
    if (data.imageUrls && data.imageUrls.length > 0) {
      for (const url of data.imageUrls) {
        await supabase.from("productimages").insert({
          productid: inserted.id,
          url,
        });
      }
    }
    // Insert product descriptions if present
    if (data.productdescriptions && data.productdescriptions.length > 0) {
      for (const desc of data.productdescriptions) {
        await supabase.from("productdescriptions").insert({
          productid: inserted.id,
          title: desc.title,
          content: desc.content,
        });
      }
    }
    // Insert variants and options if present
    if (data.productvariants && data.productvariants.length > 0) {
      for (const variant of data.productvariants) {
        const { id, ...variantInsert } = variant; // omit id
        const { data: variantRow, error: variantError } = await supabase.from("productvariants").insert({
          productid: inserted.id,
          name: variantInsert.name,
          ispublished: variantInsert.ispublished,
        }).select().single();
        if (variantError || !variantRow) continue;
        if (variant.productvariantoptions && variant.productvariantoptions.length > 0) {
          for (const option of variant.productvariantoptions) {
            const { id: optId, ...optionInsert } = option; // omit id
            await supabase.from("productvariantoptions").insert({
              variantid: variantRow.id,
              name: optionInsert.name,
              price: optionInsert.price,
              ispublished: optionInsert.ispublished,
              isoutofstock: optionInsert.isoutofstock,
              isdefault: optionInsert.isdefault,
            });
          }
        }
      }
    }
    // Reload the product with relations to ensure UI is up to date
    const { data: fullProduct } = await supabase
      .from("products")
      .select(`*, productimages(url)`) // add more relations if needed
      .eq("id", inserted.id)
      .single();
    setProducts((prev) => [...prev, { ...fullProduct, imageUrls: (fullProduct?.productimages || []).map((img: any) => img.url) }]);
  }

  function handleRowClick(productId: number) {
    // Fetch full product details including images, descriptions, variants, options
    supabase
      .from("products")
      .select(`*, productimages(url), productdescriptions(*), productvariants(*, productvariantoptions(*))`)
      .eq("id", productId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEditProduct({
            ...data,
            imageUrls: (data.productimages || []).map((img: any) => img.url),
            productdescriptions: data.productdescriptions || [],
            productvariants: (data.productvariants || []).map((v: any) => ({
              ...v,
              productvariantoptions: v.productvariantoptions || []
            })),
          });
          setEditOpen(true);
        }
      });
  }

  function handleDeleteProduct(productId: number) {
    setDeleteId(productId);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (deleteId == null) return;
    await supabase.from("products").delete().eq("id", deleteId);
    setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    setEditOpen(false);
    setConfirmOpen(false);
    setDeleteId(null);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8">
        <svg className="animate-spin h-8 w-8 text-green-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <span className="text-green-700 font-medium text-lg">Loading products...</span>
      </div>
    );
  }

  // filtering + sorting
  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage-1)*perPage, currentPage*perPage);

  // top 4 by orderCount


  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-8 pb-24 md:pb-0">
      {/* Search and Add Button Row */}
      <div className="flex items-center gap-2 mb-2">
        <Input placeholder="Search products..." value={query} onChange={(e:any)=>{setQuery(e.target.value); setCurrentPage(1)}} className="flex-1" />
        <Button onClick={() => setAddOpen(true)} className="bg-green-600 text-white">Add</Button>
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
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-zinc-900 shadow-sm rounded-xl border border-gray-200 dark:border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm border-collapse rounded-xl shadow-md overflow-hidden bg-white dark:bg-zinc-900">
            <thead>
              <tr className="bg-green-50 dark:bg-zinc-800 text-left text-gray-600 dark:text-gray-200">
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="border-b hover:bg-green-50 dark:hover:bg-zinc-800 cursor-pointer transition" onClick={() => handleRowClick(p.id)}>
                  {/* Product (merged with price) */}
                  <td className="p-3 align-top">
                    <div className="flex items-center gap-3">
                      <img src={p.imageUrls?.[0] || "/vite.svg"} alt={p.name} className="h-12 w-12 rounded-md object-cover" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm tracking-wide">{p.name}</span>
                        <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{p.price}</span>
                      </div>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="p-3 align-top" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {p.ispublished ? (
                        <Button size="sm" className="bg-red-600 text-white flex items-center gap-1" onClick={e => { e.stopPropagation(); setPublished(p.id, false); }}>
                          <EyeOff size={16} />
                          <span className="hidden xs:inline">Unpublish</span>
                        </Button>
                      ) : (
                        <Button size="sm" className="bg-green-600 text-white flex items-center gap-1" onClick={e => { e.stopPropagation(); setPublished(p.id, true); }}>
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
          {paginated.map((p, idx) => (
            <div
              key={p.id}
              className="rounded-xl shadow-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg transition animate-fadein-slideup min-h-[120px] w-full"
              style={{ animationDelay: `${idx * 60}ms` }}
              onClick={() => handleRowClick(p.id)}
            >
              <div className="flex flex-row items-center justify-between w-full mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate max-w-[70%]">{p.name}</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{p.price}</span>
              </div>
              <div className="flex flex-row items-center gap-3 w-full">
                <img
                  src={p.imageUrls?.[0] || "/vite.svg"}
                  alt={p.name}
                  className="h-12 w-12 object-contain rounded-xl border border-green-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm"
                />
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all ${p.ispublished ? 'bg-green-600 text-white border border-green-600' : 'bg-rose-600 text-white border border-rose-600'}`}>{p.ispublished ? 'Published' : 'Unpublished'}</span>
                {p.ispublished ? (
                  <Button size="sm" className="bg-red-600 text-white flex items-center gap-1 ml-auto" onClick={e => { e.stopPropagation(); setPublished(p.id, false); }}>
                    <EyeOff size={16} />
                    <span className="hidden xs:inline">Unpublish</span>
                  </Button>
                ) : (
                  <Button size="sm" className="bg-green-600 text-white flex items-center gap-1 ml-auto" onClick={e => { e.stopPropagation(); setPublished(p.id, true); }}>
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
      <div className="flex items-center justify-center gap-3 mt-4">
        <Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setCurrentPage((p)=>Math.max(1,p-1))}><ChevronLeft size={16} /> Previous</Button>
        <span>Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setCurrentPage((p)=>Math.min(totalPages,p+1))}>Next <ChevronRight size={16} /></Button>
      </div>

      {/* Add Product Drawer */}
      <AddProductDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddProduct} />
      {editOpen && editProduct && (
        <EditProductDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          product={editProduct}
          onDelete={handleDeleteProduct}
          onSave={handleUpdateProduct}
        />
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Product?"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteId(null); }}
      />
    </div>
  );
}
