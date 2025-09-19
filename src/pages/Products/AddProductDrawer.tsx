import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import type { IProduct, IVariant, IOption } from "@/interfaces/IProduct";
import type { ICategory } from "@/interfaces/ICategory";
import { getCategories } from "../api";

interface AddProductDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: Partial<IProduct>) => void;
}

export default function AddProductDrawer({ open, onClose, onAdd }: AddProductDrawerProps) {
  useEffect(() => {
    if (open) {
      console.log("[AddProductDrawer] Drawer opened");
    } else {
      console.log("[AddProductDrawer] Drawer closed");
    }
  }, [open]);
  const [name, setName] = useState("");
  const [shortdescription, setShortdescription] = useState<string>("");
  const [price, setPrice] = useState("");
  const [categoryid, setCategoryId] = useState<string>("");
  const [labels, setLabels] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  // Removed unused description state
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [variants, setVariants] = useState<IVariant[]>([]);
  const [descriptions, setDescriptions] = useState<{ id?: number; title: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
  console.log("[AddProductDrawer] Submit attempt", { name, price, categoryid, labels, selectedFiles, imageUrl, isPublished, variants, descriptions });
    e.preventDefault();
  setLoading(true);
    let imageUrls: string[] = [];
    if (selectedFiles.length > 0) {
      console.log("[AddProductDrawer] Uploading selected files", selectedFiles.map(f => f.name));
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from("storeadmin").upload(fileName, file, { upsert: false });
        if (error) {
          console.error("[AddProductDrawer] Image upload failed", error);
          alert("Image upload failed");
          setLoading(false);
          return;
        }
        const publicUrl = supabase.storage.from("storeadmin").getPublicUrl(fileName).data.publicUrl;
        imageUrls.push(publicUrl);
      }
    } else if (imageUrl) {
      console.log("[AddProductDrawer] Using imageUrl", imageUrl);
      imageUrls = [imageUrl];
    }
    await onAdd({
      name,
      shortdescription: shortdescription || null,
      price: Number(price),
      categoryid,
      labels: labels.split(",").map(l => l.trim()).filter(Boolean),
      image: imageUrls[0],
      imageUrls,
      ispublished: isPublished,
      productdescriptions: descriptions as any,
      productvariants: variants,
    });
    setLoading(false);
  setName("");
  setShortdescription("");
    setPrice("");
    setCategoryId("");
    setLabels("");
    setImageUrl("");
    setSelectedFiles([]);
    setIsPublished(true);
  // Removed unused setDescription
    setVariants([]);
    setDescriptions([]);
  console.log("[AddProductDrawer] Drawer closing after submit");
  onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[AddProductDrawer] File input changed", e.target.files ? Array.from(e.target.files).map(f => f.name) : []);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
  setSelectedFiles(files);
  setImageUrl("");
  if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addVariant = () => {
    console.log("[AddProductDrawer] Add Variant");
    setVariants([
      ...variants,
      { id: Date.now() * -1, name: '', ispublished: true, productvariantoptions: [] }
    ]);
  };
  const removeVariant = (idx: number) => {
    console.log("[AddProductDrawer] Remove Variant", idx);
    setVariants(variants.filter((_, i) => i !== idx));
  };
  const updateVariant = (idx: number, key: keyof IVariant, value: any) => {
    // Optionally log updates, but can be noisy
    // console.log("[AddProductDrawer] Update Variant", { idx, key, value });
    setVariants(variants.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  };
  const addOption = (vIdx: number) => {
    console.log("[AddProductDrawer] Add Option to Variant", vIdx);
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: [
        ...v.productvariantoptions,
        { id: Date.now() * -1, name: '', price: 0, ispublished: true, isoutofstock: false, isdefault: false }
      ]
    } : v));
  };
  const removeOption = (vIdx: number, oIdx: number) => {
    console.log("[AddProductDrawer] Remove Option", { vIdx, oIdx });
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: v.productvariantoptions.filter((_, j) => j !== oIdx)
    } : v));
  };
  const updateOption = (vIdx: number, oIdx: number, key: keyof IOption, value: any) => {
    // Optionally log updates, but can be noisy
    // console.log("[AddProductDrawer] Update Option", { vIdx, oIdx, key, value });
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: v.productvariantoptions.map((o, j) => j === oIdx ? { ...o, [key]: value } : o)
    } : v));
  };
  const addDescription = () => {
    console.log("[AddProductDrawer] Add Description");
    setDescriptions([...descriptions, { id: undefined, title: '', content: '' }]);
  };
  const removeDescription = (idx: number) => {
    console.log("[AddProductDrawer] Remove Description", idx);
    setDescriptions(descriptions.filter((_, i) => i !== idx));
  };
  const updateDescription = (idx: number, key: 'title' | 'content', value: string) => {
    // Optionally log updates, but can be noisy
    // console.log("[AddProductDrawer] Update Description", { idx, key, value });
    setDescriptions(descriptions.map((desc, i) => i === idx ? { ...desc, [key]: value } : desc));
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 w-full max-w-md flex flex-col h-full bg-white dark:bg-zinc-900">
        {/* Removed duplicate short description input at top */}
        {/* Sticky Header with Close */}
        <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold text-green-700 dark:text-green-200">Add New Product</h2>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-zinc-700"
            type="button"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </Button>
        </div>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="product-add-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Product name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <Input
              value={shortdescription}
              onChange={(e) => setShortdescription(e.target.value)}
              placeholder="Short description (optional)"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              type="number"
              placeholder="Price"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <div className="flex items-center gap-2 mb-2">
              {categoryid && categories.find(cat => String(cat.id) === categoryid) && (
                <img
                  src={categories.find(cat => String(cat.id) === categoryid)?.image_url}
                  alt={categories.find(cat => String(cat.id) === categoryid)?.name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              <select
                value={categoryid}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="block w-full border rounded p-2 appearance-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled>Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Labels (comma separated)</label>
            <Input
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="e.g. organic,vegan"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Images</label>
            {selectedFiles.length > 0 ? (
              <div className="flex flex-col gap-2 items-start">
                {selectedFiles.map((file, idx) => (
                  <span key={idx} className="text-xs text-gray-700">{file.name}</span>
                ))}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => { setSelectedFiles([]); setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                >
                  Remove Images
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descriptions</label>
            <div className="flex flex-col gap-4">
              {descriptions.map((desc, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50 dark:bg-zinc-900 flex flex-col gap-2 relative">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={desc.title}
                      onChange={e => updateDescription(idx, 'title', e.target.value)}
                      placeholder="Label/Title"
                      className="flex-1"
                    />
                    <Button type="button" size="icon" variant="destructive" onClick={() => removeDescription(idx)} title="Remove Description">
                      <span className="sr-only">Remove</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                  <textarea
                    value={desc.content}
                    onChange={e => updateDescription(idx, 'content', e.target.value)}
                    placeholder="Description content"
                    className="block w-full border rounded p-2 min-h-[60px]"
                  />
                </div>
              ))}
              <Button type="button" size="sm" className="mt-2" onClick={addDescription}>+ Add Description</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              id="isPublished"
            />
            <label htmlFor="isPublished" className="text-sm">
              Published
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Variants</label>
            <div className="flex flex-col gap-6">
            {variants.map((variant, vIdx) => (
              <div key={vIdx} className="border rounded-xl p-4 mb-2 bg-gray-50 dark:bg-zinc-900 shadow-sm">
                <div className="flex flex-wrap gap-4 mb-4 items-center">
                  <Input
                    value={variant.name}
                    onChange={e => updateVariant(vIdx, 'name', e.target.value)}
                    placeholder="Variant name (e.g. Size, Color)"
                    className="flex-1 min-w-[180px]"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={variant.ispublished}
                      onChange={e => updateVariant(vIdx, 'ispublished', e.target.checked)}
                    /> Published
                  </label>
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeVariant(vIdx)}>Remove</Button>
                </div>
                <div className="flex flex-col gap-4">
                  <label className="block text-xs font-medium mb-1">Options</label>
                  {variant.productvariantoptions.map((option, oIdx) => (
                    <div key={oIdx} className="bg-white dark:bg-zinc-800 border rounded-lg shadow-sm p-4 flex flex-col gap-3 relative">
                      <div className="flex flex-wrap gap-4 items-center">
                        <Input
                          value={option.name ?? ''}
                          onChange={e => updateOption(vIdx, oIdx, 'name', e.target.value)}
                          placeholder="Option name (e.g. Small, Red)"
                          className="flex-1 min-w-[180px]"
                        />
                        <Input
                          type="number"
                          value={option.price ?? 0}
                          onChange={e => updateOption(vIdx, oIdx, 'price', Number(e.target.value))}
                          placeholder="Price"
                          className="w-32"
                        />
                        <Button type="button" size="icon" variant="destructive" onClick={() => removeOption(vIdx, oIdx)} title="Remove Option">
                          <span className="sr-only">Remove</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={option.ispublished}
                            onChange={e => updateOption(vIdx, oIdx, 'ispublished', e.target.checked)}
                          /> Published
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={option.isoutofstock}
                            onChange={e => updateOption(vIdx, oIdx, 'isoutofstock', e.target.checked)}
                          /> Out of stock
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={option.isdefault}
                            onChange={e => updateOption(vIdx, oIdx, 'isdefault', e.target.checked)}
                          /> Default
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button type="button" size="sm" className="mt-2" onClick={() => addOption(vIdx)}>+ Add Option</Button>
                </div>
              </div>
            ))}
            </div>
            <Button type="button" size="sm" onClick={addVariant}>+ Add Variant</Button>
          </div>
          </form>
        </div>
        {/* Fixed Add Product Button at Bottom */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-0">
          <Button
            type="submit"
            form="product-add-form"
            disabled={loading}
            className="w-full h-14 rounded-none bg-green-600 hover:bg-green-700 text-white border-green-700 text-base"
            variant="default"
          >
            {loading ? "Adding..." : "Add Product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
