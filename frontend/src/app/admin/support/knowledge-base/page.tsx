'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, DataTable } from '@/components/shared';
import { ArrowLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import { ColumnDef } from '@tanstack/react-table';

type Article = {
  id: string;
  title: string;
  category: string;
  status: 'published' | 'draft';
  views: number;
  helpfulCount: number;
  updatedAt: string;
};

export default function KnowledgeBasePage() {
  const router = useRouter();

  const articles: Article[] = [
    { id: '1', title: 'How to set up WhatsApp integration', category: 'Integration', status: 'published', views: 1250, helpfulCount: 142, updatedAt: '2024-03-10' },
    { id: '2', title: 'Google Sheets sync troubleshooting', category: 'Integration', status: 'published', views: 980, helpfulCount: 98, updatedAt: '2024-03-09' },
    { id: '3', title: 'Understanding billing cycles', category: 'Billing', status: 'published', views: 750, helpfulCount: 85, updatedAt: '2024-03-08' },
    { id: '4', title: 'Patient management best practices', category: 'Features', status: 'draft', views: 0, helpfulCount: 0, updatedAt: '2024-03-07' },
  ];

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
          row.original.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'views',
      header: 'Views',
      cell: ({ row }) => row.original.views.toLocaleString(),
    },
    {
      accessorKey: 'helpfulCount',
      header: 'Helpful',
      cell: ({ row }) => row.original.helpfulCount.toLocaleString(),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
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
            <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
            <p className="mt-2 text-sm text-gray-600">Manage help articles and documentation</p>
          </div>
        </div>
        <Button>Create Article</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Articles</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{articles.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Published</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">
            {articles.filter(a => a.status === 'published').length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {articles.reduce((sum, a) => sum + a.views, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Helpful Votes</h3>
          <p className="mt-2 text-3xl font-semibold text-purple-600">
            {articles.reduce((sum, a) => sum + a.helpfulCount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      <DataTable
        data={articles}
        columns={columns}
        loading={false}
        emptyStateTitle="No articles found"
        emptyStateDescription="Create your first article to get started"
      />
    </div>
  );
}
