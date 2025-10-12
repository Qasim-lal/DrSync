'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, Button, Modal } from '@/components/shared';
import { ColumnDef } from '@tanstack/react-table';
import { Transaction } from '@/lib/types/billing';
import { useTransactions, useBillingActions } from '@/lib/hooks';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ReceiptRefundIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, isLoading, isError, refresh } = useTransactions();
  const { retryPayment, processRefund } = useBillingActions();

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleRetry = async (transactionId: string) => {
    try {
      await retryPayment(transactionId);
      toast.success('Payment retry initiated');
      refresh();
    } catch (error) {
      toast.error('Failed to retry payment');
    }
  };

  const handleRefundClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRefundAmount(transaction.amount.toString());
    setShowRefundModal(true);
  };

  const handleRefund = async () => {
    if (!selectedTransaction || !refundAmount) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedTransaction.amount) {
      toast.error('Invalid refund amount');
      return;
    }

    setIsProcessing(true);
    try {
      await processRefund(selectedTransaction.id, amount);
      toast.success('Refund processed successfully');
      setShowRefundModal(false);
      refresh();
    } catch (error) {
      toast.error('Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'organizationName',
      header: 'Organization',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {row.original.organizationName || 'Unknown'}
          </span>
          <span className="text-sm text-gray-500">{row.original.organizationId}</span>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const statusColors = {
          pending: 'bg-yellow-100 text-yellow-800',
          completed: 'bg-green-100 text-green-800',
          failed: 'bg-red-100 text-red-800',
          refunded: 'bg-gray-100 text-gray-800',
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
      accessorKey: 'paymentMethod',
      header: 'Method',
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.paymentMethod || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">
              {date.toLocaleDateString()}
            </span>
            <span className="text-xs text-gray-500">
              {date.toLocaleTimeString()}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex gap-2">
            {transaction.status === 'failed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetry(transaction.id);
                }}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retry
              </Button>
            )}
            {transaction.status === 'completed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefundClick(transaction);
                }}
              >
                <ReceiptRefundIcon className="h-4 w-4" />
                Refund
              </Button>
            )}
          </div>
        );
      },
    },
  ];

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
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and manage all payment transactions
            </p>
          </div>
        </div>
        <Button onClick={refresh}>Refresh</Button>
      </div>

      {/* Transactions Table */}
      <DataTable
        error={isError}
        onRetry={refresh}
        data={transactions || []}
        columns={columns}
        loading={isLoading}
        emptyStateTitle="No transactions found"
        emptyStateDescription="Transactions will appear here once payments are processed"
      />

      {/* Refund Modal */}
      <Modal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        title="Process Refund"
        description={`Process a refund for transaction ${selectedTransaction?.id}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Original Amount
            </label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {selectedTransaction &&
                formatCurrency(
                  selectedTransaction.amount,
                  selectedTransaction.currency
                )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refund Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter refund amount"
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum: {selectedTransaction?.amount}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowRefundModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={handleRefund}
              loading={isProcessing}
            >
              Process Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
