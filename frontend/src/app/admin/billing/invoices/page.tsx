'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Button, Modal, LoadingSpinner } from '@/components/shared';
import { ColumnDef } from '@tanstack/react-table';
import { Invoice } from '@/lib/types/billing';
import { useInvoices, useInvoicePreview, useBillingActions } from '@/lib/hooks';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, isLoading, isError, refresh } = useInvoices();
  const { generateInvoice } = useBillingActions();

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { invoicePreview, isLoading: previewLoading } = useInvoicePreview(
    showPreviewModal ? selectedOrgId : null
  );

  const [isGenerating, setIsGenerating] = useState(false);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handlePreview = (orgId: string) => {
    setSelectedOrgId(orgId);
    setShowPreviewModal(true);
  };

  const handleGenerate = async (orgId: string) => {
    setIsGenerating(true);
    try {
      await generateInvoice(orgId);
      toast.success('Invoice generated successfully');
      refresh();
    } catch (error) {
      toast.error('Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice #',
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {row.original.invoiceNumber}
        </span>
      ),
    },
    {
      accessorKey: 'organizationName',
      header: 'Organization',
      cell: ({ row }) => (
        <button
          onClick={() =>
            router.push(`/admin/organizations/${row.original.organizationId}`)
          }
          className="text-left hover:underline"
        >
          <div className="flex flex-col">
            <span className="font-medium text-blue-600">
              {row.original.organizationName || 'Unknown'}
            </span>
            <span className="text-sm text-gray-500">
              {row.original.organizationId.slice(0, 8)}...
            </span>
          </div>
        </button>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900">
          {formatCurrency(row.original.total, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusColors = {
          draft: 'bg-gray-100 text-gray-800',
          open: 'bg-blue-100 text-blue-800',
          paid: 'bg-green-100 text-green-800',
          void: 'bg-red-100 text-red-800',
          uncollectible: 'bg-orange-100 text-orange-800',
        };
        const status = row.original.status;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[status]}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => {
        const date = new Date(row.original.dueDate);
        const isPastDue = date < new Date() && row.original.status !== 'paid';
        return (
          <div className="flex flex-col">
            <span className={`text-sm ${isPastDue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
              {date.toLocaleDateString()}
            </span>
            {isPastDue && (
              <span className="text-xs text-red-500">Past due</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <span className="text-sm text-gray-500">
            {date.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const invoice = row.original;
        return (
          <div className="flex gap-2">
            {invoice.pdfUrl && (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="outline">
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  PDF
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(invoice.organizationId);
              }}
            >
              <EyeIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Filter invoices by status
  const draftInvoices = invoices?.filter((inv) => inv.status === 'draft').length || 0;
  const openInvoices = invoices?.filter((inv) => inv.status === 'open').length || 0;
  const paidInvoices = invoices?.filter((inv) => inv.status === 'paid').length || 0;
  const totalAmount = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage invoices and billing documents
            </p>
          </div>
        </div>
        <Button onClick={refresh}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {invoices?.length || 0}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Draft</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {draftInvoices}
          </p>
          <p className="mt-1 text-sm text-gray-600">Pending generation</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Open</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {openInvoices}
          </p>
          <p className="mt-1 text-sm text-gray-600">Awaiting payment</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Paid</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {paidInvoices}
          </p>
          <p className="mt-1 text-sm text-gray-600">Completed</p>
        </div>
      </div>

      {/* Invoices Table */}
      <DataTable
        data={invoices || []}
        columns={columns}
        loading={isLoading}
        emptyStateTitle="No invoices found"
        emptyStateDescription="Invoices will appear here once generated"
      />

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Invoice Preview"
        size="lg"
      >
        {previewLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : invoicePreview ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {invoicePreview.organizationName}
              </h3>
              <p className="text-sm text-gray-500">
                Billing Period: {new Date(invoicePreview.billingPeriod.start).toLocaleDateString()} -{' '}
                {new Date(invoicePreview.billingPeriod.end).toLocaleDateString()}
              </p>
            </div>

            {/* Items */}
            <div>
              <h4 className="mb-3 font-medium text-gray-900">Line Items</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoicePreview.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(item.unitPrice, invoicePreview.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount, invoicePreview.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoicePreview.subtotal, invoicePreview.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoicePreview.tax, invoicePreview.currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-gray-900">
                    {formatCurrency(invoicePreview.total, invoicePreview.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t pt-4">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowPreviewModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  if (selectedOrgId) {
                    handleGenerate(selectedOrgId);
                    setShowPreviewModal(false);
                  }
                }}
                loading={isGenerating}
              >
                Generate Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No preview available
          </div>
        )}
      </Modal>
    </div>
  );
}
