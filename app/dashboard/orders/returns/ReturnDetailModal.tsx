'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { XMarkIcon, CheckIcon, XCircleIcon, PencilIcon } from '@heroicons/react/24/outline'

interface ReturnDetailModalProps {
  isOpen: boolean
  onClose: () => void
  returnId: number | null
  onStatusChange: () => void
}

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
  customer_name?: string
}

interface OrderDetail {
  orderdetail_id: string
  order_id: string
  product_id: number
  name_product: string
  name_check?: string
  quantity: number
  unit_price: number
  subtotal: number
}

export default function ReturnDetailModal({ isOpen, onClose, returnId, onStatusChange }: ReturnDetailModalProps) {
  const supabase = createClientComponentClient()
  const [returnData, setReturnData] = useState<Return | null>(null)
  const [orderData, setOrderData] = useState<Order | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedStatus, setEditedStatus] = useState('')
  const [editedReason, setEditedReason] = useState('')
  const [editedRefundAmount, setEditedRefundAmount] = useState('')
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
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

  // Lấy dữ liệu khi modal mở và có returnId
  useEffect(() => {
    if (isOpen && returnId && mounted) {
      console.log('Modal mở, bắt đầu lấy dữ liệu với returnId:', returnId)
      fetchReturnData()
    }
  }, [isOpen, returnId, mounted])

  // Ghi log khi component được render
  useEffect(() => {
    console.log('ReturnDetailModal rendered với returnId:', returnId)
    console.log('Modal state:', { isOpen, mounted, loading, error })
  }, [isOpen, returnId, mounted, loading, error])

  // Lấy dữ liệu trả hàng và đơn hàng liên quan
  const fetchReturnData = async () => {
    if (!returnId) {
      setError("Không có ID yêu cầu đổi/trả")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Lấy thông tin trả hàng
      const { data: returnData, error: returnError } = await supabase
        .from('returns')
        .select('*')
        .eq('return_id', returnId)
        .single()

      if (returnError) {
        console.error('Lỗi khi lấy thông tin trả hàng:', returnError)
        setError(`Không thể tải thông tin trả hàng. Vui lòng thử lại.`)
        setLoading(false)
        return
      }

      if (returnData) {
        setReturnData(returnData)
        setEditedStatus(returnData.status)
        setEditedReason(returnData.return_reason)
        setEditedRefundAmount(returnData.refund_amount ? returnData.refund_amount.toString() : '')

        try {
          // Lấy thông tin đơn hàng
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('order_id', returnData.order_id)
            .single()

          if (!orderError && orderData) {
            // Tạo đối tượng đơn hàng với thông tin cơ bản
            const orderWithCustomer = {
              ...orderData,
              customer_name: 'Khách hàng'
            }

            setOrderData(orderWithCustomer)

            // Lấy chi tiết đơn hàng
            const { data: orderDetailsData, error: orderDetailsError } = await supabase
              .from('orderdetails')
              .select('orderdetail_id, order_id, product_id, name_product, name_check, quantity, unit_price, subtotal')
              .eq('order_id', returnData.order_id)

            if (orderDetailsError) {
              console.error('Lỗi khi lấy chi tiết đơn hàng:', orderDetailsError)
            } else if (orderDetailsData && orderDetailsData.length > 0) {
              console.log('Chi tiết đơn hàng:', orderDetailsData)
              setOrderDetails(orderDetailsData)
            } else {
              console.log('Không tìm thấy chi tiết đơn hàng cho order_id:', returnData.order_id)
            }
          } else {
            // Tạo đối tượng đơn hàng giả nếu không tìm thấy
            setOrderData({
              order_id: returnData.order_id,
              customer_id: '',
              order_date: new Date().toISOString(),
              price: returnData.refund_amount || 0,
              status: 'unknown',
              customer_name: 'Không xác định'
            })
          }
        } catch (error) {
          console.error('Lỗi khi lấy thông tin đơn hàng:', error)
          // Vẫn tiếp tục hiển thị thông tin trả hàng
        }
      } else {
        setError(`Không tìm thấy thông tin trả hàng với ID: ${returnId}`)
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy dữ liệu trả hàng:', error)
      setError('Không thể tải thông tin trả hàng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Cập nhật trạng thái trả hàng
  const updateReturnStatus = async (newStatus: string) => {
    if (!returnData) return

    try {
      setStatusUpdateLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('returns')
        .update({ status: newStatus })
        .eq('return_id', returnData.return_id)
        .select()

      if (error) throw error

      // Hiển thị tên trạng thái người dùng có thể đọc được
      const statusDisplay = newStatus === 'pending' ? 'Đang xử lý' :
                           newStatus === 'approved' ? 'Đã chấp nhận' :
                           newStatus === 'rejected' ? 'Từ chối' : newStatus

      setSuccess(`Cập nhật trạng thái thành công: ${statusDisplay}`)
      setReturnData({ ...returnData, status: newStatus })

      // Thông báo cho component cha biết trạng thái đã thay đổi
      onStatusChange()

      // Ẩn thông báo thành công sau 2 giây
      setTimeout(() => {
        setSuccess(null)
      }, 2000)
    } catch (error: any) {
      console.error('Lỗi khi cập nhật trạng thái:', error)

      // Hiển thị thông báo lỗi chi tiết hơn
      if (error.message) {
        setError(`Lỗi: ${error.message}`)
      } else if (error.details) {
        setError(`Lỗi: ${error.details}`)
      } else if (error.hint) {
        setError(`Gợi ý: ${error.hint}`)
      } else {
        setError('Không thể cập nhật trạng thái. Vui lòng thử lại.')
      }
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  // Lưu thông tin đã chỉnh sửa
  const saveChanges = async () => {
    if (!returnData) return

    try {
      setStatusUpdateLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('returns')
        .update({
          status: editedStatus,
          return_reason: editedReason,
          refund_amount: editedRefundAmount ? parseFloat(editedRefundAmount) : null
        })
        .eq('return_id', returnData.return_id)
        .select()

      if (error) throw error

      setSuccess('Cập nhật thông tin thành công')
      setReturnData({
        ...returnData,
        status: editedStatus,
        return_reason: editedReason,
        refund_amount: editedRefundAmount ? parseFloat(editedRefundAmount) : null
      })

      // Thông báo cho component cha biết trạng thái đã thay đổi
      onStatusChange()

      // Tắt chế độ chỉnh sửa
      setIsEditing(false)

      // Ẩn thông báo thành công sau 2 giây
      setTimeout(() => {
        setSuccess(null)
      }, 2000)
    } catch (error: any) {
      console.error('Lỗi khi cập nhật thông tin:', error)

      // Hiển thị thông báo lỗi chi tiết hơn
      if (error.message) {
        setError(`Lỗi: ${error.message}`)
      } else if (error.details) {
        setError(`Lỗi: ${error.details}`)
      } else if (error.hint) {
        setError(`Gợi ý: ${error.hint}`)
      } else {
        setError('Không thể cập nhật thông tin. Vui lòng thử lại.')
      }
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  // Hủy chỉnh sửa
  const cancelEdit = () => {
    if (!returnData) return

    setEditedStatus(returnData.status)
    setEditedReason(returnData.return_reason)
    setEditedRefundAmount(returnData.refund_amount ? returnData.refund_amount.toString() : '')
    setIsEditing(false)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 backdrop-brightness-[0.5] backdrop-blur-[0.8px]" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white rounded-lg max-w-3xl w-full"
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
            <h3 className="text-lg font-medium text-gray-900">
              Chi tiết yêu cầu đổi/trả #{returnId}
            </h3>
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2">Đang tải...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md overflow-auto max-h-96">
                <p className="font-bold mb-2">Lỗi:</p>
                <pre className="whitespace-pre-wrap text-sm">{error}</pre>
                <div className="mt-4">
                  <p className="font-bold mb-2">Thông tin debug:</p>
                  <p className="text-sm">Return ID: {returnId}</p>
                  <p className="text-sm">Mounted: {mounted ? 'Yes' : 'No'}</p>
                  <p className="text-sm">Loading: {loading ? 'Yes' : 'No'}</p>
                  <button
                    onClick={() => fetchReturnData()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            ) : returnData ? (
              <div>
                {/* Thông báo thành công */}
                {success && (
                  <div className="mb-4 p-2 bg-green-50 text-green-700 text-sm rounded-md">
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Thông tin yêu cầu đổi/trả */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Thông tin yêu cầu đổi/trả</h4>

                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">Mã yêu cầu:</span>
                        <p className="text-sm font-medium">{returnData.return_id}</p>
                      </div>



                      <div>
                        <span className="text-xs text-gray-500">Ngày tạo:</span>
                        <p className="text-sm font-medium">
                          {new Date(returnData.return_date).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500">Trạng thái:</span>
                        {isEditing ? (
                          <select
                            value={editedStatus}
                            onChange={(e) => setEditedStatus(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="pending">Đang xử lý</option>
                            <option value="approved">Đã chấp nhận</option>
                            <option value="rejected">Từ chối</option>
                          </select>
                        ) : (
                          <p className="text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBgColor(returnData.status)}`}>
                              {getStatusDisplay(returnData.status)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thông tin đơn hàng */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Thông tin đơn hàng</h4>

                    {orderData ? (
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500">Mã đơn hàng:</span>
                          <p className="text-sm font-medium">{orderData.order_id}</p>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500">Ngày đặt hàng:</span>
                          <p className="text-sm font-medium">
                            {orderData.order_date ? new Date(orderData.order_date).toLocaleDateString('vi-VN') : 'N/A'}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500">Khách hàng:</span>
                          <p className="text-sm font-medium">{orderData.customer_name || 'Không xác định'}</p>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500">Tổng tiền đơn hàng:</span>
                          <p className="text-sm font-medium">{orderData.price ? formatCurrency(orderData.price) : 'N/A'}</p>
                        </div>

                        <div>
                          <span className="text-xs text-gray-500">Trạng thái đơn hàng:</span>
                          <p className="text-sm font-medium">{orderData.status || 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        <p>Không tìm thấy thông tin đơn hàng</p>
                        <p className="mt-2 text-xs">Mã đơn hàng: {returnData?.order_id || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lý do đổi/trả */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Lý do đổi/trả</h4>
                  {isEditing ? (
                    <textarea
                      value={editedReason}
                      onChange={(e) => setEditedReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <p className="text-sm bg-gray-50 p-3 rounded-md">{returnData.return_reason}</p>
                  )}
                </div>

                {/* Số tiền hoàn lại */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Số tiền hoàn lại</h4>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">đ</span>
                      <input
                        type="number"
                        value={editedRefundAmount}
                        onChange={(e) => setEditedRefundAmount(e.target.value)}
                        min="0"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{formatCurrency(returnData.refund_amount)}</p>
                  )}
                </div>

                {/* Chi tiết sản phẩm trong đơn hàng */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sản phẩm trong đơn hàng</h4>

                  <div className="bg-gray-50 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sản phẩm
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Số lượng
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Đơn giá
                          </th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orderDetails && orderDetails.length > 0 ? (
                          orderDetails.map((detail) => (
                            <tr key={detail.orderdetail_id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.name_product}
                                {detail.name_check && <span className="text-xs text-gray-500 block">{detail.name_check}</span>}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {detail.quantity}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(detail.unit_price)}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(detail.subtotal)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-center">
                              Không có dữ liệu sản phẩm
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {orderDetails && orderDetails.length > 0 && (
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                              Tổng cộng:
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {formatCurrency(orderDetails.reduce((sum, item) => sum + item.subtotal, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-between mt-6">
                  <div>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        Chỉnh sửa
                      </button>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={saveChanges}
                          disabled={statusUpdateLoading}
                          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${statusUpdateLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {statusUpdateLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </>
                    ) : (
                      <>
                        {returnData.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateReturnStatus('rejected')}
                              disabled={statusUpdateLoading}
                              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${statusUpdateLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Từ chối
                            </button>
                            <button
                              type="button"
                              onClick={() => updateReturnStatus('approved')}
                              disabled={statusUpdateLoading}
                              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${statusUpdateLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Chấp nhận
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Đóng
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy thông tin yêu cầu đổi/trả
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
