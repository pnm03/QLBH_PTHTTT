'use client'

import { useState, useEffect } from 'react'
// createClientComponentClient removed as unused
// useRouter removed as unused
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import Link from 'next/link'
import {
  // ChartBarIcon removed as unused
  DocumentTextIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  // ArrowTrendingUpIcon removed as unused
  // CurrencyDollarIcon removed as unused
  CalendarDaysIcon,
  // ClipboardDocumentListIcon removed as unused
  TruckIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

export default function ReportsPage() {
  // const router = useRouter() // Removed unused variable
  // const supabase = createClientComponentClient() // Removed unused variable
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context khi component đã mounted
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
    }
  }, [mounted, themeContext.currentTheme])

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Báo cáo</h1>
      </div>

      {/* Danh sách các loại báo cáo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Báo cáo đơn hàng */}
        <Link
          href="/dashboard/reports/orders"
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-${themeColor}-100`}>
                <DocumentTextIcon className={`h-6 w-6 text-${themeColor}-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo đơn hàng</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thống kê chi tiết về đơn hàng, doanh thu theo thời gian
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-${themeColor}-600`}>
                Xem báo cáo
              </span>
            </div>
          </div>
        </Link>

        {/* Báo cáo khách hàng */}
        <div className={`bg-white overflow-hidden shadow rounded-lg opacity-60 cursor-not-allowed`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-gray-100`}>
                <UserGroupIcon className={`h-6 w-6 text-gray-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo khách hàng</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thống kê về khách hàng, tần suất mua hàng
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-gray-400`}>
                Đang phát triển
              </span>
            </div>
          </div>
        </div>

        {/* Báo cáo sản phẩm */}
        <Link
          href="/dashboard/reports/products" // Add link to the new page
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300`} // Remove disabled styles
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-${themeColor}-100`}> {/* Use theme color */}
                <ShoppingBagIcon className={`h-6 w-6 text-${themeColor}-600`} /> {/* Use theme color */}
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo sản phẩm</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thống kê về sản phẩm bán chạy, tồn kho
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-${themeColor}-600`}> {/* Use theme color */}
                Xem báo cáo
              </span> {/* Change text */}
            </div>
          </div>
        </Link> {/* Add missing closing Link tag */}

        {/* Báo cáo tài chính */}
        <Link
          href="/dashboard/reports/financial"
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-${themeColor}-100`}>
                <BanknotesIcon className={`h-6 w-6 text-${themeColor}-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo tài chính</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thống kê thu chi, dòng tiền theo thời gian
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-${themeColor}-600`}>
                Xem báo cáo
              </span>
            </div>
          </div>
        </Link>

        {/* Báo cáo vận chuyển */}
        <Link
          href="/dashboard/reports/shipping"
          className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-300`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-${themeColor}-100`}>
                <TruckIcon className={`h-6 w-6 text-${themeColor}-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo vận chuyển</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thống kê về đơn vận chuyển, tình trạng giao hàng
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-${themeColor}-600`}>
                Xem báo cáo
              </span>
            </div>
          </div>
        </Link>

        {/* Báo cáo theo thời gian */}
        <div className={`bg-white overflow-hidden shadow rounded-lg opacity-60 cursor-not-allowed`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 bg-gray-100`}>
                <CalendarDaysIcon className={`h-6 w-6 text-gray-600`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">Báo cáo theo thời gian</h3>
                <p className="mt-1 text-sm text-gray-500">
                  So sánh dữ liệu theo các khoảng thời gian
                </p>
              </div>
            </div>
          </div>
          <div className={`bg-gray-50 px-5 py-3 border-t border-gray-200`}>
            <div className="text-sm">
              <span className={`font-medium text-gray-400`}>
                Đang phát triển
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
