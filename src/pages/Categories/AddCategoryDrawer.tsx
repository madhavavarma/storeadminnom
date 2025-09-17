import { useState, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";

interface AddCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; image_url: string; is_published: boolean }) => void;
}

export default function AddCategoryDrawer({ open, onClose, onAdd }: AddCategoryDrawerProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    await onAdd({ name, image_url: finalImageUrl, is_published: isPublished });

    setLoading(false);
    setName("");
    setImageUrl("");
    setSelectedFile(null);
    setIsPublished(true);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImageUrl(""); // clear preview until upload
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 w-full max-w-md flex flex-col h-full bg-white dark:bg-zinc-900">
        {/* Sticky Header with Close */}
        <div className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-bold text-green-700 dark:text-green-200">Add New Category</h2>
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
          <form id="category-add-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                    onClick={() => { setSelectedFile(null); setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              )}
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
          </form>
        </div>
        {/* Fixed Add Category Button at Bottom */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-0">
          <Button
            type="submit"
            form="category-add-form"
            disabled={loading}
            className="w-full h-14 rounded-none bg-green-600 hover:bg-green-700 text-white border-green-700 text-base"
            variant="default"
          >
            {loading ? "Adding..." : "Add Category"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}