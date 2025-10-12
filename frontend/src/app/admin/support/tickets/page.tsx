'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, DataTable } from '@/components/shared';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ColumnDef } from '@tanstack/react-table';

type Ticket = {
  id: string;
  ticketNumber: string;
  organization: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  assignedTo?: string;
};

export default function TicketsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');

  const tickets: Ticket[] = [
    { id: '1', ticketNumber: '#T-1234', organization: 'Dental Care Plus', subject: 'WhatsApp not sending messages', priority: 'high', status: 'in_progress', createdAt: '2024-03-10', assignedTo: 'John Doe' },
    { id: '2', ticketNumber: '#T-1233', organization: 'Health Clinic 360', subject: 'Billing discrepancy', priority: 'medium', status: 'open', createdAt: '2024-03-09' },
    { id: '3', ticketNumber: '#T-1232', organization: 'MediPro', subject: 'Sheets sync failing', priority: 'urgent', status: 'open', createdAt: '2024-03-09' },
    { id: '4', ticketNumber: '#T-1231', organization: 'Care Plus', subject: 'Account setup help', priority: 'low', status: 'resolved', createdAt: '2024-03-08', assignedTo: 'Jane Smith' },
    { id: '5', ticketNumber: '#T-1230', organization: 'Health First', subject: 'Feature request: Reports', priority: 'medium', status: 'closed', createdAt: '2024-03-07' },
  ];

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority as keyof typeof colors];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors];
  };

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: 'ticketNumber',
      header: 'Ticket',
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-blue-600">{row.original.ticketNumber}</span>
      ),
    },
    {
      accessorKey: 'organization',
      header: 'Organization',
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(row.original.priority)}`}>
          {row.original.priority}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(row.original.status)}`}>
          {row.original.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned To',
      cell: ({ row }) => row.original.assignedTo || '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="mt-2 text-sm text-gray-600">Manage customer support tickets</p>
          </div>
        </div>
        <Button>Create Ticket</Button>
      </div>

      <div className="flex gap-3">
        {['all', 'open', 'in_progress', 'resolved'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      <DataTable
        data={tickets.filter(t => statusFilter === 'all' || t.status === statusFilter)}
        columns={columns}
        loading={false}
        emptyStateTitle="No tickets found"
        emptyStateDescription="No tickets match your filters"
      />
    </div>
  );
}
