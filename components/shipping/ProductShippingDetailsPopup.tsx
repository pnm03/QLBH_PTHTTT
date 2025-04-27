'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ProductShippingDetailsPopupProps {
  productName: string
  onClose: () => void
  themeColor?: string
}

interface ShippingDetail {
  shipping_id: string
  order_id: string
  name_customer: string
  phone_customer: string
  status: string
  created_at: string
  tracking_number: string
}

export default function ProductShippingDetailsPopup({
  productName,
  onClose,
  themeColor = 'indigo'
}: ProductShippingDetailsPopupProps) {
  const [shippingDetails, setShippingDetails] = useState<ShippingDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShippingDetails = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Lấy danh sách đơn hàng có chứa sản phẩm này
        const { data: orderDetails, error: orderDetailsError } = await supabase
          .from('orderdetails')
          .select('order_id')
          .eq('name_product', productName)

        if (orderDetailsError) {
          throw orderDetailsError
        }

        if (!orderDetails || orderDetails.length === 0) {
          setShippingDetails([])
          return
        }

        // Lấy danh sách order_id
        const orderIds = orderDetails.map(detail => detail.order_id)

        // Lấy thông tin vận chuyển cho các đơn hàng này
        const { data: shippings, error: shippingsError } = await supabase
          .from('shippings')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })

        if (shippingsError) {
          throw shippingsError
        }

        setShippingDetails(shippings || [])
      } catch (err) {
        console.error('Lỗi khi lấy thông tin vận chuyển:', err)
        setError('Không thể lấy thông tin vận chuyển. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }

    fetchShippingDetails()
  }, [productName])

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'đã giao hàng':
        return 'bg-green-100 text-green-800'
      case 'đang vận chuyển':
        return 'bg-blue-100 text-blue-800'
      case 'đã hủy':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800' // Chờ xử lý
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 bg-${themeColor}-50 rounded-t-lg flex justify-between items-center`}>
          <h3 className={`text-lg font-medium text-${themeColor}-900`}>
            Chi tiết vận chuyển: {productName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
              <p className="ml-2 text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
            </div>
          ) : shippingDetails.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không tìm thấy thông tin vận chuyển cho sản phẩm này.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã vận chuyển
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã đơn hàng
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Khách hàng
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã vận đơn
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shippingDetails.map((shipping) => (
                    <tr key={shipping.shipping_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shipping.shipping_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipping.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipping.name_customer}<br />
                        <span className="text-xs text-gray-400">{shipping.phone_customer}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(shipping.status)}`}>
                          {shipping.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(shipping.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipping.tracking_number || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 bg-${themeColor}-600 text-white rounded-md hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
