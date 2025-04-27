'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface AddReturnModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Order {
  order_id: string
  customer_id: string
  order_date: string
  price: number
  status: string
}

export default function AddReturnModal({ isOpen, onClose, onSuccess }: AddReturnModalProps) {
  const supabase = createClientComponentClient()
  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Order[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
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

  // Reset form khi modal đóng/mở
  useEffect(() => {
    if (isOpen) {
      setOrderId('')
      setReason('')
      setRefundAmount('')
      setStatus('pending')
      setError(null)
      setSuccess(null)
      setSearchTerm('')
      setSearchResults([])
      setShowSearchResults(false)
    }
  }, [isOpen])

  // Tìm kiếm đơn hàng
  const searchOrders = async () => {
    if (!searchTerm || searchTerm.length < 1) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`order_id.ilike.%${searchTerm}%`)
        .limit(5)

      if (error) throw error

      setSearchResults(data || [])
      setShowSearchResults(true)
    } catch (error) {
      console.error('Lỗi khi tìm kiếm đơn hàng:', error)
      setError('Không thể tìm kiếm đơn hàng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Xử lý khi nhấn Enter trong ô tìm kiếm
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchOrders()
    }
  }

  // Chọn đơn hàng từ kết quả tìm kiếm
  const selectOrder = (order: Order) => {
    setOrderId(order.order_id)
    // Tự động điền số tiền hoàn lại bằng số tiền đơn hàng
    if (order.price) {
      setRefundAmount(order.price.toString())
    }
    setShowSearchResults(false)
  }

  // Xử lý submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!orderId) {
      setError('Vui lòng nhập mã đơn hàng')
      return
    }

    if (!reason) {
      setError('Vui lòng nhập lý do đổi/trả hàng')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Kiểm tra đơn hàng tồn tại
      const { data: orderExists, error: orderCheckError } = await supabase
        .from('orders')
        .select('order_id')
        .eq('order_id', orderId)
        .single()

      if (orderCheckError || !orderExists) {
        setError('Mã đơn hàng không tồn tại')
        setLoading(false)
        return
      }

      // Kiểm tra đơn hàng đã có yêu cầu đổi/trả chưa
      const { data: existingReturn, error: returnCheckError } = await supabase
        .from('returns')
        .select('return_id')
        .eq('order_id', orderId)
        .single()

      if (existingReturn) {
        setError('Đơn hàng này đã có yêu cầu đổi/trả')
        setLoading(false)
        return
      }

      // Thêm yêu cầu đổi/trả mới
      const newReturn = {
        order_id: orderId,
        return_date: new Date().toISOString(),
        return_reason: reason,
        refund_amount: refundAmount ? parseFloat(refundAmount) : null,
        status: status
      }

      console.log('Đang thêm yêu cầu đổi/trả mới:', newReturn)

      const { data, error } = await supabase
        .from('returns')
        .insert([newReturn])

      if (error) {
        console.error('Lỗi chi tiết khi thêm yêu cầu đổi/trả:', error)
        throw error
      }

      setSuccess('Thêm yêu cầu đổi/trả thành công')

      // Đóng modal và làm mới danh sách sau 2 giây
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Lỗi khi thêm yêu cầu đổi/trả:', error)

      // Hiển thị thông báo lỗi chi tiết hơn
      if (error.message) {
        setError(`Lỗi: ${error.message}`)
      } else if (error.details) {
        setError(`Lỗi: ${error.details}`)
      } else if (error.hint) {
        setError(`Gợi ý: ${error.hint}`)
      } else {
        setError('Không thể thêm yêu cầu đổi/trả. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Lấy theme color
  const themeColor = themeContext.selectedTheme || 'indigo'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 backdrop-brightness-[0.5] backdrop-blur-[0.8px]" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white rounded-lg max-w-md w-full"
          style={{
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: themeColor === 'indigo' ? '#818cf8' :
                        themeColor === 'blue' ? '#60a5fa' :
                        themeColor === 'red' ? '#f87171' :
                        themeColor === 'green' ? '#6ee7b7' :
                        themeColor === 'purple' ? '#c084fc' :
                        themeColor === 'pink' ? '#f472b6' :
                        themeColor === 'yellow' ? '#fcd34d' :
                        themeColor === 'orange' ? '#fb923c' : '#818cf8'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Thêm Yêu Cầu Đổi/Trả Mới</h3>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <form onSubmit={handleSubmit}>


              {/* Mã đơn hàng */}
              <div className="mb-4">
                <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-1">
                  Mã đơn hàng gốc <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="orderId"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Nhập mã đơn hàng cần đổi/trả"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="mt-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Gõ ít nhất 1 ký tự để tìm kiếm mã đơn hàng"
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={searchOrders}
                    className={`mt-1 w-full inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                  >
                    <MagnifyingGlassIcon className="h-3 w-3 mr-1" />
                    Tìm kiếm
                  </button>
                </div>

                {/* Kết quả tìm kiếm */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                    <ul className="max-h-40 overflow-y-auto">
                      {searchResults.map((order) => (
                        <li
                          key={order.order_id}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectOrder(order)}
                        >
                          <div className="text-sm font-medium">{order.order_id}</div>
                          <div className="text-xs text-gray-500">
                            Ngày đặt: {new Date(order.order_date).toLocaleDateString('vi-VN')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {showSearchResults && searchResults.length === 0 && (
                  <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-md">
                    Không tìm thấy đơn hàng nào
                  </div>
                )}
              </div>

              {/* Lý do đổi/trả */}
              <div className="mb-4">
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do đổi/trả <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả chi tiết lý do đổi/trả hàng"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Số tiền hoàn lại */}
              <div className="mb-4">
                <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền hoàn lại (Tùy chọn)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">đ</span>
                  <input
                    type="number"
                    id="refundAmount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Nhập số tiền cần hoàn lại cho khách hàng (nếu có)</p>
              </div>

              {/* Trạng thái */}
              <div className="mb-4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="pending">Đang xử lý</option>
                  <option value="approved">Đã chấp nhận</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>

              {/* Thông báo lỗi/thành công */}
              {error && (
                <div className="mb-4 p-2 bg-red-50 text-red-700 text-sm rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-4 p-2 bg-green-50 text-green-700 text-sm rounded-md">
                  {success}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Đang xử lý...' : 'Thêm yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
