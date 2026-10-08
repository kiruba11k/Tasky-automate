import React from 'react';
import { Badge } from '@/components/ui/badge';

const styles = {
  Assigned: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  Submitted: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  Approved: 'bg-green-500/20 text-green-300 border-green-500/40',
  'Changes Requested': 'bg-red-500/20 text-red-300 border-red-500/40',
};

export default function StatusBadge({ status, className = '' }) {
  return <Badge variant="outline" className={`${styles[status] || styles.Assigned} ${className}`}>{status === 'Assigned' ? 'To do' : status}</Badge>;
}
