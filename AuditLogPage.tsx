import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, Spinner, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/calc';
import type { AuditLog } from '@/lib/types';
import { ScrollText, Search } from 'lucide-react';

export function AuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast(error.message, 'error');
    setLogs((data || []) as AuditLog[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const actions = ['all', 'create_invoice', 'edit_invoice', 'cancel_invoice', 'record_payment', 'create_quote', 'convert_quote_to_invoice', 'create_delivery_note', 'update_company_settings'];

  const filtered = logs.filter((l) => {
    const matchSearch = !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.record_label?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const formatAction = (action: string) => action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div>
      <PageHeader title="Audit Log" subtitle={`${logs.length} recorded actions`} />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input className="input pl-10" placeholder="Search audit log..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[200px]" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : formatAction(a)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries" description="Actions like creating invoices and recording payments will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Record Type</th><th>Reference</th></tr></thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="text-sm text-slate-500">{new Date(l.created_at).toLocaleString('en-ZA')}</td>
                    <td className="text-slate-600">{l.user_name || '—'}</td>
                    <td className="font-medium text-slate-700">{formatAction(l.action)}</td>
                    <td className="capitalize text-slate-500">{l.record_type}</td>
                    <td className="text-slate-600">{l.record_label || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
