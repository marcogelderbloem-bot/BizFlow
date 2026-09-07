import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader, Spinner, StatusBadge } from '@/components/ui';
import { formatCurrency, formatCurrencyShort, formatDate, daysOverdue } from '@/lib/calc';
import type { Invoice, Customer } from '@/lib/types';
import { TrendingUp, DollarSign, FileText, AlertCircle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardData {
  salesThisMonth: number;
  salesThisYear: number;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  quotesThisMonth: number;
  acceptedQuotes: number;
  quoteConversionRate: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  monthlySales: { month: string; value: number }[];
  monthlyInvoicing: { month: string; value: number }[];
  monthlyPayments: { month: string; value: number }[];
  overdueTable: (Invoice & { customer: Customer | null })[];
}

export function DashboardPage({ onViewInvoice }: { onViewInvoice: (id: string) => void }) {
  const { company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: invoices } = await supabase.from('invoices').select('*, customer:customers(*)').neq('status', 'cancelled');
    const { data: quotes } = await supabase.from('quotes').select('*');
    const { data: payments } = await supabase.from('payments').select('amount, payment_date');

    const allInvoices = (invoices || []) as (Invoice & { customer: Customer | null })[];
    const allQuotes = quotes || [];
    const allPayments = payments || [];

    const salesThisMonth = allInvoices
      .filter((i) => new Date(i.invoice_date) >= monthStart)
      .reduce((s, i) => s + Number(i.total), 0);
    const salesThisYear = allInvoices
      .filter((i) => new Date(i.invoice_date) >= yearStart)
      .reduce((s, i) => s + Number(i.total), 0);
    const totalInvoiced = allInvoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = allInvoices.reduce((s, i) => s + Number(i.paid_amount), 0);
    const totalOutstanding = allInvoices.reduce((s, i) => s + Number(i.balance), 0);
    const totalOverdue = allInvoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + Number(i.balance), 0);
    const quotesThisMonth = allQuotes.filter((q) => new Date(q.quote_date) >= monthStart).length;
    const acceptedQuotes = allQuotes.filter((q) => q.status === 'accepted').length;
    const totalQuotes = allQuotes.length;
    const quoteConversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;
    const unpaidInvoices = allInvoices.filter((i) => i.balance > 0 && i.status !== 'cancelled').length;
    const overdueInvoices = allInvoices.filter((i) => i.status === 'overdue').length;

    // Monthly charts (last 6 months)
    const monthlySales: { month: string; value: number }[] = [];
    const monthlyInvoicing: { month: string; value: number }[] = [];
    const monthlyPayments: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('en-ZA', { month: 'short' });
      monthlySales.push({ month: label, value: allInvoices.filter((inv) => { const dt = new Date(inv.invoice_date); return dt >= d && dt < next; }).reduce((s, inv) => s + Number(inv.total), 0) });
      monthlyInvoicing.push({ month: label, value: allInvoices.filter((inv) => { const dt = new Date(inv.invoice_date); return dt >= d && dt < next; }).reduce((s, inv) => s + Number(inv.total), 0) });
      monthlyPayments.push({ month: label, value: allPayments.filter((p) => { const dt = new Date(p.payment_date); return dt >= d && dt < next; }).reduce((s, p) => s + Number(p.amount), 0) });
    }

    const overdueTable = allInvoices
      .filter((i) => i.status === 'overdue')
      .sort((a, b) => daysOverdue(a.due_date) - daysOverdue(b.due_date))
      .slice(0, 10);

    setData({
      salesThisMonth, salesThisYear, totalInvoiced, totalPaid, totalOutstanding, totalOverdue,
      quotesThisMonth, acceptedQuotes, quoteConversionRate, unpaidInvoices, overdueInvoices,
      monthlySales, monthlyInvoicing, monthlyPayments, overdueTable,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!data) return null;

  const kpis = [
    { label: 'Sales This Month', value: formatCurrency(data.salesThisMonth), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Sales This Year', value: formatCurrency(data.salesThisYear), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Invoiced', value: formatCurrency(data.totalInvoiced), icon: FileText, color: 'text-slate-700', bg: 'bg-slate-100' },
    { label: 'Total Paid', value: formatCurrency(data.totalPaid), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Outstanding', value: formatCurrency(data.totalOutstanding), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Overdue', value: formatCurrency(data.totalOverdue), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={company?.name} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="stat-card">
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${kpi.bg} mb-3`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs text-slate-500">Quotes This Month</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.quotesThisMonth}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500">Accepted Quotes</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{data.acceptedQuotes}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500">Quote Conversion Rate</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{data.quoteConversionRate.toFixed(1)}%</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-500">Unpaid Invoices</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{data.unpaidInvoices} <span className="text-sm text-red-600">({data.overdueInvoices} overdue)</span></p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Monthly Sales" data={data.monthlySales} color="bg-blue-600" />
        <ChartCard title="Payments Received" data={data.monthlyPayments} color="bg-green-600" />
      </div>

      {/* Overdue table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Overdue Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Customer</th><th>Invoice #</th><th>Date</th><th>Due Date</th><th className="text-right">Days Overdue</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {data.overdueTable.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-400 py-8">No overdue invoices</td></tr>
              ) : data.overdueTable.map((inv) => (
                <tr key={inv.id} className="cursor-pointer" onClick={() => onViewInvoice(inv.id)}>
                  <td className="text-slate-600">{inv.customer?.company_name || '—'}</td>
                  <td className="font-medium text-blue-700">{inv.invoice_number}</td>
                  <td className="text-sm text-slate-500">{formatDate(inv.invoice_date)}</td>
                  <td className="text-sm text-slate-500">{formatDate(inv.due_date)}</td>
                  <td className="text-right"><span className="badge-red">{daysOverdue(inv.due_date)} days</span></td>
                  <td className="text-right">{formatCurrency(Number(inv.total))}</td>
                  <td className="text-right text-green-600">{formatCurrency(Number(inv.paid_amount))}</td>
                  <td className="text-right font-medium text-red-600">{formatCurrency(Number(inv.balance))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: { month: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>
      <div className="flex items-end justify-between gap-3 h-40">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
              <div
                className={`w-full max-w-[40px] ${color} rounded-t-md transition-all duration-500 hover:opacity-80`}
                style={{ height: `${(d.value / max) * 100}%`, minHeight: '4px' }}
                title={formatCurrency(d.value)}
              />
            </div>
            <span className="text-xs text-slate-500">{d.month}</span>
            <span className="text-xs font-medium text-slate-700">{formatCurrencyShort(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
