'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { XCircleIcon } from '@heroicons/react/24/solid'

interface AccessDeniedProps {
  message?: string
}

export default function AccessDenied({ message = 'Truy cập bị từ chối. Bạn không có quyền truy cập trang này.' }: AccessDeniedProps) {
  const router = useRouter()

  return (
    <div className="py-10 text-center bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Truy cập bị từ chối</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Quay lại Trang chủ
        </button>
      </div>
    </div>
  )
}
