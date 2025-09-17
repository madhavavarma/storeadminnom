import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { DialogDescription } from "./dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent showCloseButton={false}>
        <DialogTitle asChild>
          <VisuallyHidden>{title}</VisuallyHidden>
        </DialogTitle>
        <DialogDescription asChild>
          <VisuallyHidden>{description}</VisuallyHidden>
        </DialogDescription>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
            <Button variant="destructive" onClick={onConfirm}>{confirmText}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
