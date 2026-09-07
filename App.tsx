import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthPage } from '@/pages/AuthPage';
import { CompanySetup } from '@/pages/CompanySetup';
import { AppLayout, type PageKey } from '@/components/AppLayout';
import { CustomersPage } from '@/components/customers/CustomersPage';
import { CustomerProfile } from '@/components/customers/CustomerProfile';
import { ProductsPage } from '@/components/products/ProductsPage';
import { QuotesPage } from '@/components/quotes/QuotesPage';
import { QuoteEditor } from '@/components/quotes/QuoteEditor';
import { QuoteDetail } from '@/components/quotes/QuoteDetail';
import { InvoicesPage } from '@/components/invoices/InvoicesPage';
import { InvoiceEditor } from '@/components/invoices/InvoiceEditor';
import { InvoiceDetail } from '@/components/invoices/InvoiceDetail';
import { PaymentsPage } from '@/components/payments/PaymentsPage';
import { DeliveryNotesPage } from '@/components/delivery-notes/DeliveryNotesPage';
import { StatementsPage } from '@/components/statements/StatementsPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { ReportsPage } from '@/components/reports/ReportsPage';
import { NotificationsPage } from '@/components/notifications/NotificationsPage';
import { AuditLogPage } from '@/components/audit/AuditLogPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { DocumentPrint } from '@/components/documents/DocumentPrint';
import { LoadingPage } from '@/components/ui';

type SimplePage = Exclude<PageKey, 'payments' | 'delivery-notes'>;

type View =
  | { page: SimplePage }
  | { page: 'customer-profile'; customerId: string }
  | { page: 'quote-editor'; quoteId?: string | null; duplicateFromId?: string | null }
  | { page: 'quote-detail'; quoteId: string }
  | { page: 'invoice-editor'; invoiceId?: string | null }
  | { page: 'invoice-detail'; invoiceId: string }
  | { page: 'print'; docType: 'quote' | 'invoice' | 'delivery_note' | 'receipt' | 'statement'; recordId: string; extraData?: { fromDate?: string; toDate?: string } }
  | { page: 'payments'; invoiceId?: string }
  | { page: 'delivery-notes'; invoiceId?: string };

function AppContent() {
  const { user, loading, needsCompanySetup, company } = useAuth();
  const [view, setView] = useState<View>({ page: 'dashboard' });

  // Update overdue statuses on load
  useEffect(() => {
    if (company) {
      supabase.rpc('update_overdue_statuses').then(() => {});
    }
  }, [company]);

  if (loading) return <LoadingPage />;

  if (!user) return <AuthPage />;

  if (needsCompanySetup) return <CompanySetup />;

  // Print view is full-screen overlay
  if (view.page === 'print') {
    return (
      <DocumentPrint
        type={view.docType}
        recordId={view.recordId}
        extraData={view.extraData}
        onClose={() => setView({ page: 'dashboard' })}
      />
    );
  }

  const navigate = (page: PageKey) => setView({ page } as View);

  return (
    <AppLayout current={view.page as PageKey} onNavigate={navigate}>
      {view.page === 'dashboard' && <DashboardPage onViewInvoice={(id) => setView({ page: 'invoice-detail', invoiceId: id })} />}

      {view.page === 'customers' && <CustomersPage onViewCustomer={(id) => setView({ page: 'customer-profile', customerId: id })} />}
      {view.page === 'customer-profile' && (
        <CustomerProfile
          customerId={view.customerId}
          onBack={() => setView({ page: 'customers' })}
          onViewInvoice={(id) => setView({ page: 'invoice-detail', invoiceId: id })}
          onViewQuote={(id) => setView({ page: 'quote-detail', quoteId: id })}
        />
      )}

      {view.page === 'products' && <ProductsPage />}

      {view.page === 'quotes' && (
        <QuotesPage
          onNewQuote={() => setView({ page: 'quote-editor', quoteId: null, duplicateFromId: null })}
          onEditQuote={(id) => setView({ page: 'quote-editor', quoteId: id, duplicateFromId: null })}
          onViewQuote={(id) => setView({ page: 'quote-detail', quoteId: id })}
          onDuplicateQuote={(id) => setView({ page: 'quote-editor', quoteId: null, duplicateFromId: id })}
        />
      )}
      {view.page === 'quote-editor' && (
        <QuoteEditor
          quoteId={view.quoteId}
          duplicateFromId={view.duplicateFromId}
          onBack={() => setView({ page: 'quotes' })}
          onSaved={(id) => setView({ page: 'quote-detail', quoteId: id })}
        />
      )}
      {view.page === 'quote-detail' && (
        <QuoteDetail
          quoteId={view.quoteId}
          onBack={() => setView({ page: 'quotes' })}
          onEdit={() => setView({ page: 'quote-editor', quoteId: view.quoteId, duplicateFromId: null })}
          onDuplicate={() => setView({ page: 'quote-editor', quoteId: null, duplicateFromId: view.quoteId })}
          onPrint={(id) => setView({ page: 'print', docType: 'quote', recordId: id })}
          onConverted={(invoiceId) => setView({ page: 'invoice-detail', invoiceId })}
        />
      )}

      {view.page === 'invoices' && (
        <InvoicesPage
          onNewInvoice={() => setView({ page: 'invoice-editor', invoiceId: null })}
          onViewInvoice={(id) => setView({ page: 'invoice-detail', invoiceId: id })}
        />
      )}
      {view.page === 'invoice-editor' && (
        <InvoiceEditor
          invoiceId={view.invoiceId}
          onBack={() => setView({ page: 'invoices' })}
          onSaved={(id) => setView({ page: 'invoice-detail', invoiceId: id })}
        />
      )}
      {view.page === 'invoice-detail' && (
        <InvoiceDetail
          invoiceId={view.invoiceId}
          onBack={() => setView({ page: 'invoices' })}
          onEdit={() => setView({ page: 'invoice-editor', invoiceId: view.invoiceId })}
          onPrint={(id) => setView({ page: 'print', docType: 'invoice', recordId: id })}
          onRecordPayment={(invoiceId) => setView({ page: 'payments', invoiceId })}
          onCreateDeliveryNote={(invoiceId) => setView({ page: 'delivery-notes', invoiceId })}
        />
      )}

      {view.page === 'payments' && (
        <PaymentsPage
          preselectedInvoiceId={view.invoiceId}
          onPrintReceipt={(paymentId) => setView({ page: 'print', docType: 'receipt', recordId: paymentId })}
        />
      )}

      {view.page === 'delivery-notes' && (
        <DeliveryNotesPage
          preselectedInvoiceId={view.invoiceId}
          onPrint={(id) => setView({ page: 'print', docType: 'delivery_note', recordId: id })}
        />
      )}

      {view.page === 'statements' && (
        <StatementsPage onPrint={(customerId, fromDate, toDate) => setView({ page: 'print', docType: 'statement', recordId: customerId, extraData: { fromDate, toDate } })} />
      )}

      {view.page === 'reports' && <ReportsPage />}

      {view.page === 'notifications' && <NotificationsPage />}

      {view.page === 'audit' && <AuditLogPage />}

      {view.page === 'settings' && <SettingsPage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
