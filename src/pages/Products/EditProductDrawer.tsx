import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import type { IProduct, IVariant, IOption, IDescription } from "@/interfaces/IProduct";
import type { ICategory } from "@/interfaces/ICategory";
import { getCategories } from "../api";

interface EditProductDrawerProps {
  open: boolean;
  onClose: () => void;
  product: IProduct;
  onSave: (data: Partial<IProduct>) => void;
  onDelete: (id: number) => void;
}

export default function EditProductDrawer({ open, onClose, product, onSave, onDelete }: EditProductDrawerProps) {
  const [name, setName] = useState(product.name || "");
  const [price, setPrice] = useState(product.price?.toString() || "");
  const [category, setCategory] = useState(product.category || "");
  const [labels, setLabels] = useState((product.labels || []).join(", "));
  const [imageUrl, setImageUrl] = useState(product.image || "");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPublished, setIsPublished] = useState(product.ispublished ?? true);
  const [loading, setLoading] = useState(false);
  const [descriptions, setDescriptions] = useState<IDescription[]>(product.productdescriptions || []);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [variants, setVariants] = useState<IVariant[]>(product.productvariants || []);
  const [shortdescription, setShortdescription] = useState(product.shortdescription || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Sync state when product changes
  useEffect(() => {
    setName(product.name || "");
    setPrice(product.price?.toString() || "");
    setCategory(product.category || "");
    setLabels((product.labels || []).join(", "));
    setImageUrl(product.image || "");
    setIsPublished(product.ispublished ?? true);
    setDescriptions(product.productdescriptions || []);
    setVariants(product.productvariants || []);
  setShortdescription(product.shortdescription || "");
  }, [product]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedFiles(files);
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Description logic
  const addDescription = () => {
    // Use a negative timestamp as a temporary id for new descriptions
    setDescriptions([
      ...descriptions,
      { id: Date.now() * -1, title: '', content: '' }
    ]);
  };
  const removeDescription = (idx: number) => {
    setDescriptions(descriptions.filter((_, i) => i !== idx));
  };
  const updateDescription = (idx: number, key: 'title' | 'content', value: string) => {
    setDescriptions(descriptions.map((desc, i) => i === idx ? { ...desc, [key]: value } : desc));
  };

  // Variant logic (same as AddProductDrawer)
  const addVariant = () => {
    setVariants([
      ...variants,
      { id: Date.now() * -1, name: '', ispublished: true, productvariantoptions: [] }
    ]);
  };
  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };
  const updateVariant = (idx: number, key: keyof IVariant, value: any) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  };
  const addOption = (vIdx: number) => {
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: [
        ...v.productvariantoptions,
        { id: Date.now() * -1, name: '', price: 0, ispublished: true, isoutofstock: false, isdefault: false }
      ]
    } : v));
  };
  const removeOption = (vIdx: number, oIdx: number) => {
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: v.productvariantoptions.filter((_, j) => j !== oIdx)
    } : v));
  };
  const updateOption = (vIdx: number, oIdx: number, key: keyof IOption, value: any) => {
    setVariants(variants.map((v, i) => i === vIdx ? {
      ...v,
      productvariantoptions: v.productvariantoptions.map((o, j) => j === oIdx ? { ...o, [key]: value } : o)
    } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let imageUrls: string[] = product.imageUrls || [];
    if (selectedFiles.length > 0) {
      imageUrls = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from("storeadmin").upload(fileName, file, { upsert: false });
        if (error) {
          alert("Image upload failed");
          setLoading(false);
          return;
        }
        const publicUrl = supabase.storage.from("storeadmin").getPublicUrl(fileName).data.publicUrl;
        imageUrls.push(publicUrl);
      }
    } else if (imageUrl) {
      imageUrls = [imageUrl];
    }
    onSave({
      id: product.id,
      name,
  shortdescription: shortdescription || null,
      price: Number(price),
      category,
      labels: labels.split(",").map(l => l.trim()).filter(Boolean),
      image: imageUrls[0],
      imageUrls,
      ispublished: isPublished,
      productdescriptions: descriptions,
      productvariants: variants,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 w-full max-w-md flex flex-col h-full bg-white dark:bg-zinc-900">
        {/* Sticky Header with Delete and Close */}
        <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold text-green-700 dark:text-green-200">Edit Product</h2>
          <div className="flex gap-2 items-center">
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              type="button"
              onClick={() => onDelete(product.id!)}
            >
              Delete
            </Button>
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
        </div>
        {/* Scrollable Content */}
        <div className="flex-systesystem 1 overflow-y-auto px-6 py-6">
          <form id="product-edit-form" onSubmit={handleSubmit} className="space-y-4">
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
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <Input
              value={shortdescription}
              onChange={(e) => setShortdescription(e.target.value)}
              placeholder="Short description (optional)"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <div className="flex items-center gap-2 mb-2">
              {category && categories.find(cat => cat.name === category) && (
                <img
                  src={categories.find(cat => cat.name === category)?.image_url}
                  alt={category}
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="block w-full border rounded p-2 appearance-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                <option value="" disabled>Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
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
            {product.imageUrls && product.imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {product.imageUrls.map((url, idx) => (
                  <img key={idx} src={url} alt="Product" className="h-12 w-12 rounded object-cover border" />
                ))}
              </div>
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
              id="isPublishedEdit"
            />
            <label htmlFor="isPublishedEdit" className="text-sm">
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
        {/* Fixed Update Product Button at Bottom */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-0">
          <Button
            type="submit"
            form="product-edit-form"
            disabled={loading}
            className="w-full h-14 rounded-none bg-green-600 hover:bg-green-700 text-white border-green-700 text-base"
            variant="default"
          >
            {loading ? "Saving..." : "Update Product"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
