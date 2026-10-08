import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { useFun } from '@/fun/FunProvider';
import { useBuddy } from '@/fun/BuddyContext';
import { buddyFor, hasWebGL } from '@/fun/three/species';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));

export default function DeleteConfirmationDialog({ isOpen, onClose, onConfirm, isDeleting = false, itemName, itemType = 'item' }) {
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const loc = useLocation();
  const species = buddyFor(loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard', pinned);
  const three = settings.view3d && hasWebGL();
  return (
    <Dialog open={!!isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        {three && isOpen && <div className="flex justify-center -mb-2"><Suspense fallback={<div style={{ height: 100 }} />}><Buddy3D species={species} pose={isDeleting ? 'dizzy' : 'scared'} size={86} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense></div>}
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
