'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  ArrowPathIcon,
  ReceiptRefundIcon
} from '@heroicons/react/24/outline'
import AddReturnModal from './AddReturnModal'
import ReturnDetailModal from './ReturnDetailModal'

// Định nghĩa các interface
interface Return {
  return_id: number
  order_id: string
  return_date: string
  return_reason: string
  refund_amount: number | null
  status: string
}

interface Order {
  order_id: string
  customer_id: string
  order_date: string
  price: number
  status: string
}

export default function ReturnsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật theme khi context thay đổi
  useEffect(() => {
    if (mounted && themeContext.selectedTheme) {
      setThemeState({
        theme: themeColors[themeContext.selectedTheme]
      })
    }
  }, [themeContext.selectedTheme, mounted])

  // Lấy danh sách trả hàng từ database
  useEffect(() => {
    const fetchReturns = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('returns')
          .select('*')
          .order('return_date', { ascending: false })

        if (error) {
          throw error
        }

        if (data) {
          setReturns(data)
        }
      } catch (error) {
        console.error('Lỗi khi lấy danh sách trả hàng:', error)
      } finally {
        setLoading(false)
      }
    }

    if (mounted) {
      fetchReturns()
    }
  }, [mounted, supabase])

  // Lọc danh sách trả hàng theo từ khóa tìm kiếm
  const filteredReturns = returns.filter(returnItem =>
    returnItem.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.return_reason.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Mở modal chi tiết trả hàng
  const openDetailModal = (returnItem: Return) => {
    console.log('Mở modal chi tiết trả hàng với dữ liệu:', returnItem)
    setSelectedReturn(returnItem)
    setShowDetailModal(true)
  }

  // Mở modal thêm trả hàng mới
  const openAddModal = () => {
    setShowAddModal(true)
  }

  // Đóng tất cả modal
  const closeAllModals = () => {
    setShowAddModal(false)
    setShowDetailModal(false)
    setSelectedReturn(null)
  }

  // Làm mới danh sách
  const refreshData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('return_date', { ascending: false })

      if (error) {
        throw error
      }

      if (data) {
        setReturns(data)
      }
    } catch (error) {
      console.error('Lỗi khi làm mới danh sách trả hàng:', error)
    } finally {
      setLoading(false)
    }
  }

  // Lấy màu nền dựa trên trạng thái
  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Hiển thị tên trạng thái người dùng có thể đọc được
  const getStatusDisplay = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Đang xử lý'
      case 'approved':
        return 'Đã chấp nhận'
      case 'rejected':
        return 'Từ chối'
      default:
        return status
    }
  }

  // Định dạng số tiền
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '0 ₫'
    // Sử dụng dấu chấm làm dấu phân cách hàng nghìn và không hiển thị phần thập phân
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Lấy theme color
  const themeColor = themeContext.selectedTheme || 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Quản lý yêu cầu đổi/trả hàng</h1>
        <div className="flex space-x-3">
          <button
            onClick={refreshData}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Làm mới
          </button>
          <button
            onClick={openAddModal}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Thêm yêu cầu
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="mb-6">
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 py-3 text-base border-gray-300 rounded-md"
            placeholder="Tìm kiếm theo mã đơn hàng hoặc lý do đổi/trả..."
            aria-label="Tìm kiếm yêu cầu đổi/trả"
          />
        </div>
      </div>

      {/* Danh sách trả hàng */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {loading ? (
            <li className="px-6 py-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="ml-2">Đang tải...</span>
            </li>
          ) : filteredReturns.length === 0 ? (
            <li className="px-6 py-12 flex flex-col items-center justify-center text-center">
              <ReceiptRefundIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Không có yêu cầu đổi/trả nào</h3>
              <p className="mt-1 text-sm text-gray-500">
                Nhấn nút "Thêm yêu cầu" để tạo yêu cầu đổi/trả mới
              </p>
            </li>
          ) : (
            filteredReturns.map((returnItem) => (
              <li key={returnItem.return_id} className="px-6 py-4 cursor-pointer hover:bg-gray-50" onClick={() => openDetailModal(returnItem)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ReceiptRefundIcon className={`h-8 w-8 text-${themeColor}-500`} />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        Yêu cầu đổi/trả #{returnItem.return_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Mã đơn hàng: {returnItem.order_id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-4 text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(returnItem.return_date).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(returnItem.refund_amount)}
                      </div>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBgColor(returnItem.status)}`}>
                      {getStatusDisplay(returnItem.status)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetailModal(returnItem);
                      }}
                      className="ml-2 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal thêm yêu cầu đổi/trả mới */}
      <AddReturnModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshData}
      />

      {/* Modal chi tiết yêu cầu đổi/trả */}
      {showDetailModal && selectedReturn && (
        <ReturnDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedReturn(null)
          }}
          returnId={selectedReturn.return_id}
          onStatusChange={refreshData}
        />
      )}
    </div>
  )
}
