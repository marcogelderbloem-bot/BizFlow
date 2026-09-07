import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import type { Customer } from '@/lib/types';

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer?: Customer | null;
}

const emptyForm = {
  customer_code: '',
  company_name: '',
  contact_person: '',
  email: '',
  telephone: '',
  mobile: '',
  physical_address: '',
  postal_address: '',
  vat_number: '',
  registration_number: '',
  payment_terms: 30,
  notes: '',
  is_active: true,
};

export function CustomerForm({ open, onClose, onSaved, customer }: CustomerFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // Load customer data when modal opens
  useEffect(() => {
    if (customer) {
      setForm({
        customer_code: customer.customer_code || '',
        company_name: customer.company_name || '',
        contact_person: customer.contact_person || '',
        email: customer.email || '',
        telephone: customer.telephone || '',
        mobile: customer.mobile || '',
        physical_address: customer.physical_address || '',
        postal_address: customer.postal_address || '',
        vat_number: customer.vat_number || '',
        registration_number: customer.registration_number || '',
        payment_terms: customer.payment_terms,
        notes: customer.notes || '',
        is_active: customer.is_active,
      });
    } else {
      setForm(emptyForm);
    }
  });

  const update = (key: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      toast('Company name is required', 'error');
      return;
    }
    setLoading(true);
    try {
      if (customer) {
        const { error } = await supabase.from('customers').update(form).eq('id', customer.id);
        if (error) throw error;
        toast('Customer updated');
      } else {
        const { error } = await supabase.from('customers').insert(form);
        if (error) throw error;
        toast('Customer created');
      }
      onSaved();
      onClose();
      setForm(emptyForm);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save customer', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'New Customer'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Code</label>
            <input className="input" value={form.customer_code} onChange={(e) => update('customer_code', e.target.value)} placeholder="CUST-001" />
          </div>
          <div>
            <label className="label">Company Name *</label>
            <input className="input" value={form.company_name} onChange={(e) => update('company_name', e.target.value)} placeholder="ABC Industries" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact Person</label>
            <input className="input" value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="jane@abc.co.za" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Telephone</label>
            <input className="input" value={form.telephone} onChange={(e) => update('telephone', e.target.value)} placeholder="011 123 4567" />
          </div>
          <div>
            <label className="label">Mobile</label>
            <input className="input" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} placeholder="082 123 4567" />
          </div>
        </div>
        <div>
          <label className="label">Physical Address</label>
          <textarea className="input" rows={2} value={form.physical_address} onChange={(e) => update('physical_address', e.target.value)} />
        </div>
        <div>
          <label className="label">Postal Address</label>
          <textarea className="input" rows={2} value={form.postal_address} onChange={(e) => update('postal_address', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">VAT Number</label>
            <input className="input" value={form.vat_number} onChange={(e) => update('vat_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Reg Number</label>
            <input className="input" value={form.registration_number} onChange={(e) => update('registration_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Payment Terms (days)</label>
            <input type="number" className="input" value={form.payment_terms} onChange={(e) => update('payment_terms', parseInt(e.target.value) || 30)} />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="rounded border-slate-300" />
          <span className="text-sm text-slate-700">Active customer</span>
        </label>
      </div>
    </Modal>
  );
}
