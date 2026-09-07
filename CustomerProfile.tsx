import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, StatusBadge, Spinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/calc';
import type { Customer, Quote, Invoice, Payment, DeliveryNote } from '@/lib/types';
import { ArrowLeft, Mail, Phone, Smartphone, MapPin, FileText, Receipt, CreditCard, Truck } from 'lucide-react';

export function CustomerProfile({
  customerId,
  onBack,
  onViewInvoice,
  onViewQuote,
}: {
  customerId: string;
  onBack: () => void;
  onViewInvoice: (id: string) => void;
  onViewQuote: (id: string) => void;
}) {
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'quotes' | 'invoices' | 'payments' | 'deliveries'>('invoices');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cust } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
    setCustomer(cust as Customer | null);

    const [{ data: q }, { data: inv }, { data: pay }, { data: dn }] = await Promise.all([
      supabase.from('quotes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', customerId).order('payment_date', { ascending: false }),
      supabase.from('delivery_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
    ]);

    setQuotes((q || []) as Quote[]);
    setInvoices((inv || []) as Invoice[]);
    setPayments((pay || []) as Payment[]);
    setDeliveryNotes((dn || []) as DeliveryNote[]);
    setLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!customer) return <div className="text-center py-8 text-slate-500">Customer not found</div>;

  const totalInvoiced = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + Number(i.paid_amount), 0);
  const outstanding = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + Number(i.balance), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.balance), 0);

  const tabs = [
    { key: 'invoices' as const, label: 'Invoices', count: invoices.length, icon: Receipt },
    { key: 'quotes' as const, label: 'Quotes', count: quotes.length, icon: FileText },
    { key: 'payments' as const, label: 'Payments', count: payments.length, icon: CreditCard },
    { key: 'deliveries' as const, label: 'Deliveries', count: deliveryNotes.length, icon: Truck },
  ];

  return (
    <div>
      <button className="btn-ghost mb-4" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Customer info */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{customer.company_name}</h2>
          <div className="space-y-3 text-sm">
            {customer.contact_person && <div className="flex items-center gap-2 text-slate-600"><FileText className="h-4 w-4 text-slate-400" /> {customer.contact_person}</div>}
            {customer.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {customer.email}</div>}
            {customer.telephone && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {customer.telephone}</div>}
            {customer.mobile && <div className="flex items-center gap-2 text-slate-600"><Smartphone className="h-4 w-4 text-slate-400" /> {customer.mobile}</div>}
            {customer.physical_address && <div className="flex items-start gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400 mt-0.5" /> {customer.physical_address}</div>}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
            {customer.vat_number && <p>VAT: {customer.vat_number}</p>}
            {customer.registration_number && <p>Reg: {customer.registration_number}</p>}
            <p>Payment Terms: {customer.payment_terms} days</p>
            <p>Created: {formatDate(customer.created_at)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="stat-card">
            <p className="text-sm text-slate-500">Total Invoiced</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Total Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Outstanding</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(outstanding)}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overdue)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="ml-1 text-xs text-slate-400">{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="card overflow-hidden">
        {tab === 'invoices' && (
          <table className="table-base">
            <thead><tr><th>Number</th><th>Date</th><th>Due Date</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No invoices</td></tr>}
              {invoices.map((inv) => (
                <tr key={inv.id} className="cursor-pointer" onClick={() => onViewInvoice(inv.id)}>
                  <td className="font-medium text-blue-700">{inv.invoice_number}</td>
                  <td>{formatDate(inv.invoice_date)}</td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td className="text-right">{formatCurrency(Number(inv.total))}</td>
                  <td className="text-right font-medium">{formatCurrency(Number(inv.balance))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'quotes' && (
          <table className="table-base">
            <thead><tr><th>Number</th><th>Date</th><th>Expiry</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {quotes.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8">No quotes</td></tr>}
              {quotes.map((q) => (
                <tr key={q.id} className="cursor-pointer" onClick={() => onViewQuote(q.id)}>
                  <td className="font-medium text-blue-700">{q.quote_number}</td>
                  <td>{formatDate(q.quote_date)}</td>
                  <td>{formatDate(q.expiry_date)}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td className="text-right">{formatCurrency(Number(q.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'payments' && (
          <table className="table-base">
            <thead><tr><th>Receipt #</th><th>Date</th><th>Invoice</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-8">No payments</td></tr>}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.payment_number}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>{invoices.find(i => i.id === p.invoice_id)?.invoice_number || '—'}</td>
                  <td className="capitalize">{p.payment_method}</td>
                  <td>{p.reference || '—'}</td>
                  <td className="text-right font-medium text-green-600">{formatCurrency(Number(p.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'deliveries' && (
          <table className="table-base">
            <thead><tr><th>Number</th><th>Date</th><th>Driver</th><th>Vehicle</th><th>Recipient</th></tr></thead>
            <tbody>
              {deliveryNotes.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-8">No delivery notes</td></tr>}
              {deliveryNotes.map((dn) => (
                <tr key={dn.id}>
                  <td className="font-medium">{dn.delivery_note_number}</td>
                  <td>{formatDate(dn.delivery_date)}</td>
                  <td>{dn.driver || '—'}</td>
                  <td>{dn.vehicle_reg || '—'}</td>
                  <td>{dn.recipient_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
