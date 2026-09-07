import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { CustomerForm } from './CustomerForm';
import { PageHeader, EmptyState, StatusBadge, Spinner } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/calc';
import type { Customer } from '@/lib/types';
import { Plus, Search, Users, Pencil, Trash2, Eye } from 'lucide-react';

interface CustomerWithStats extends Customer {
  total_invoiced: number;
  total_paid: number;
  outstanding: number;
  overdue: number;
}

export function CustomersPage({ onViewCustomer }: { onViewCustomer: (id: string) => void }) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('company_name');

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    // Fetch stats per customer
    const enriched = await Promise.all(
      (data || []).map(async (c) => {
        const { data: inv } = await supabase
          .from('invoices')
          .select('total, paid_amount, balance, due_date, status')
          .eq('customer_id', c.id)
          .neq('status', 'cancelled');

        const invoices = inv || [];
        const total_invoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
        const total_paid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);
        const outstanding = invoices.reduce((s, i) => s + Number(i.balance), 0);
        const overdue = invoices
          .filter((i) => i.status === 'overdue')
          .reduce((s, i) => s + Number(i.balance), 0);

        return { ...c, total_invoiced, total_paid, outstanding, overdue } as CustomerWithStats;
      })
    );

    setCustomers(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('customers').delete().eq('id', deleteId);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Customer deleted');
      loadCustomers();
    }
  };

  const filtered = customers.filter((c) =>
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start creating quotes and invoices."
          action={
            <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> New Customer
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th className="text-right">Total Invoiced</th>
                  <th className="text-right">Outstanding</th>
                  <th className="text-right">Overdue</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button
                        className="font-medium text-slate-900 hover:text-blue-700"
                        onClick={() => onViewCustomer(c.id)}
                      >
                        {c.company_name}
                      </button>
                      {c.customer_code && <p className="text-xs text-slate-400">{c.customer_code}</p>}
                    </td>
                    <td>
                      <p className="text-sm text-slate-600">{c.contact_person || '—'}</p>
                      <p className="text-xs text-slate-400">{c.email || c.telephone || ''}</p>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(c.total_invoiced)}</td>
                    <td className="text-right font-medium text-amber-600">{formatCurrency(c.outstanding)}</td>
                    <td className="text-right font-medium text-red-600">{formatCurrency(c.overdue)}</td>
                    <td>{c.is_active ? <StatusBadge status="sent" /> : <StatusBadge status="draft" />}</td>
                    <td className="text-sm text-slate-500">{formatDate(c.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => onViewCustomer(c.id)} title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => { setEditing(c); setFormOpen(true); }}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(c.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadCustomers}
        customer={editing}
      />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure? This will permanently delete this customer. Invoices and payments will remain but will be unlinked."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
