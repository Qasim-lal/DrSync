'use client';

import React from 'react';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Search or Breadcrumb */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Super Admin Dashboard
          </h2>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" />
            {/* Notification badge */}
            <span className="absolute right-1 top-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          {/* Profile dropdown */}
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="sr-only">Open user menu</span>
            <UserCircleIcon className="h-8 w-8" />
            <span className="text-sm font-medium text-gray-700">
              Admin User
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
