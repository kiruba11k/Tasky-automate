import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const inviteUrl = (token) => `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;

/** Shows a one-time invitation link for the admin to share with the invitee. */
export default function InviteLinkDialog({ open, onOpenChange, name, token }) {
  const [copied, setCopied] = useState(false);
  const url = token ? inviteUrl(token) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard unavailable: the field is selectable */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setCopied(false); onOpenChange(o); }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Invitation link for {name}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Share this link with them. It is shown only once, works once, and expires in 7 days.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="bg-slate-800 border-slate-700 text-white" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-slate-600 text-slate-200">Close</Button>
          <Button onClick={copy} className="bg-blue-600 hover:bg-blue-700">{copied ? 'Copied!' : 'Copy link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
