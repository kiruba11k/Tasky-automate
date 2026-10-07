import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, isDeleting = false, itemName, itemType = 'item' }) {
  return (
    <Dialog open={!!isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Delete {itemType}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you sure you want to delete <span className="font-semibold text-white">{itemName || `this ${itemType}`}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting} className="bg-transparent border-slate-600 text-slate-200">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
