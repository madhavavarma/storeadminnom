import React, { useState, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { supabase } from "@/supabaseClient";
import type { ICategory } from "@/interfaces/ICategory";

interface EditCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  category: ICategory | null;
  onUpdate: (data: Partial<ICategory>) => void;
  onDelete: (id: number, image_url: string) => void;
}

export default function EditCategoryDrawer({ open, onClose, category, onUpdate, onDelete }: EditCategoryDrawerProps) {
  const [name, setName] = useState(category?.name || "");
  const [imageUrl, setImageUrl] = useState(category?.image_url || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(category?.is_published ?? true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update state when category changes
  React.useEffect(() => {
    setName(category?.name || "");
    setImageUrl(category?.image_url || "");
    setIsPublished(category?.is_published ?? true);
    setSelectedFile(null);
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let finalImageUrl = imageUrl;
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const { error } = await supabase.storage.from("storeadmin").upload(fileName, selectedFile, { upsert: false });
      if (error) {
        alert("Image upload failed");
        setLoading(false);
        return;
      }
      finalImageUrl = supabase.storage.from("storeadmin").getPublicUrl(fileName).data.publicUrl;
    }
    onUpdate({ id: category?.id, name, image_url: finalImageUrl, is_published: isPublished });
    setLoading(false);
    onClose();
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const handleDelete = async () => {
    setConfirmOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!category) return;
    // Remove image from storage if present
    if (category.image_url) {
      const splitStr = '/object/public/storeadmin/';
      const idx = category.image_url.indexOf(splitStr);
      let path = '';
      if (idx !== -1) {
        path = category.image_url.substring(idx + splitStr.length);
        await supabase.storage.from('storeadmin').remove([path]);
      }
    }
    onDelete(category.id, category.image_url);
    setConfirmOpen(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 w-full max-w-md flex flex-col h-full bg-white dark:bg-zinc-900">
        {/* Sticky Header with Close */}
        <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold text-green-700 dark:text-green-200">Edit Category</h2>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              type="button"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800"
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="category-edit-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              {selectedFile ? (
                <div className="flex flex-col gap-2 items-start">
                  <span className="text-xs text-gray-700">{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => { setSelectedFile(null); setImageUrl(category?.image_url || ""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <>
                  {imageUrl && (
                    <img src={imageUrl} alt="Category" className="h-20 w-20 object-contain border rounded-md mb-2" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={e => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
                id="isPublishedEdit"
              />
              <label htmlFor="isPublishedEdit" className="text-sm">Published</label>
            </div>
          </form>
        </div>
        {/* Fixed Update Button at Bottom */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-0">
          <Button
            type="submit"
            form="category-edit-form"
            disabled={loading}
            className="w-full h-14 rounded-none bg-green-600 hover:bg-green-700 text-white border-green-700 text-base"
            variant="default"
          >
            {loading ? "Updating..." : "Update Category"}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title="Delete Category?"
            description="Are you sure you want to delete this category? This action cannot be undone."
            confirmText="Yes, Delete"
            cancelText="Cancel"
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
