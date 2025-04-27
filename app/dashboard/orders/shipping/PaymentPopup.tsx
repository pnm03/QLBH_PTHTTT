'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface PaymentMethod {
  payment_id: number
  payment_method_name: string
}

interface PaymentPopupProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  onPaymentSuccess: () => void
}

export default function PaymentPopup({ isOpen, onClose, orderId, onPaymentSuccess }: PaymentPopupProps) {
  const supabase = createClientComponentClient()
  const themeContext = useTheme()
  const themeColor = themeContext.currentTheme || themeColors.indigo

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Lấy danh sách phương thức thanh toán khi component được mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('payment_id, payment_method_name')
          .order('payment_id')

        if (error) {
          console.error('Lỗi khi lấy phương thức thanh toán:', error)
          setError('Không thể tải phương thức thanh toán. Vui lòng thử lại sau.')
        } else {
          setPaymentMethods(data || [])
          // Chọn phương thức thanh toán đầu tiên mặc định nếu có
          if (data && data.length > 0) {
            setSelectedPaymentMethod(data[0].payment_id)
          }
        }
      } catch (err) {
        console.error('Lỗi không mong muốn:', err)
        setError('Đã xảy ra lỗi. Vui lòng thử lại sau.')
      }
    }

    if (isOpen) {
      fetchPaymentMethods()
    }
  }, [isOpen, supabase])

  // Xử lý thanh toán
  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      setError('Vui lòng chọn phương thức thanh toán')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Cập nhật trạng thái đơn hàng thành "Đã thanh toán"
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'Đã thanh toán',
          payment_method: selectedPaymentMethod
        })
        .eq('order_id', orderId)

      if (updateError) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', updateError)
        setError(`Lỗi khi thanh toán: ${updateError.message}`)
      } else {
        setSuccess(true)
        // Đợi 2 giây trước khi đóng popup
        setTimeout(() => {
          onPaymentSuccess()
          onClose()
        }, 2000)
      }
    } catch (err) {
      console.error('Lỗi không mong muốn khi thanh toán:', err)
      setError('Đã xảy ra lỗi khi thanh toán. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="payment-modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 backdrop-blur-[2px] bg-black/10 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">​</span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Modal Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-grow">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="payment-modal-title">
                  Thanh toán đơn hàng
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Mã đơn hàng: {orderId}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                onClick={onClose}
              >
                <span className="sr-only">Đóng</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="px-4 py-5 sm:p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success ? (
              <div className="flex flex-col items-center justify-center py-6">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                <p className="text-lg font-medium text-green-600">Thanh toán thành công!</p>
                <p className="text-sm text-gray-500 mt-2">Đơn hàng đã được cập nhật.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn phương thức thanh toán
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedPaymentMethod || ''}
                    onChange={(e) => setSelectedPaymentMethod(Number(e.target.value))}
                    disabled={loading}
                  >
                    <option value="">-- Chọn phương thức thanh toán --</option>
                    {paymentMethods.map((method) => (
                      <option key={method.payment_id} value={method.payment_id}>
                        {method.payment_method_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            {!success && (
              <button
                type="button"
                onClick={handlePayment}
                disabled={loading || !selectedPaymentMethod}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : 'Xác nhận thanh toán'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 sm:mt-0 ${!success ? 'sm:ml-3' : ''} sm:w-auto sm:text-sm`}
            >
              {success ? 'Đóng' : 'Hủy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
