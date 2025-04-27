'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// useRouter removed as it's unused
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  // CalendarDaysIcon removed
  ChartBarIcon,
  CurrencyDollarIcon,
  // DocumentTextIcon removed
  PrinterIcon,
  // TableCellsIcon removed
  // ArrowDownTrayIcon removed
  PresentationChartLineIcon,
  // CircleStackIcon removed
  // UserGroupIcon removed
  ShoppingBagIcon,
  // TruckIcon removed
  // CheckCircleIcon removed
  // ClockIcon removed
  ArrowTrendingUpIcon,
  ArchiveBoxIcon,
  TagIcon,
  FireIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface Product {
  product_id: number
  product_name: string
  description: string | null
  color: string | null
  size: string | null
  price: number
  stock_quantity: number
  created_at: string | null
  updated_at: string | null
  image: string | null
  category?: string | null
  total_sold?: number
  revenue?: number
}

interface ProductSummary {
  totalProducts: number
  totalValue: number
  avgPrice: number
  lowStockProducts: number
  outOfStockProducts: number
  totalSold: number
  totalRevenue: number
}

interface ChartData {
  labels: string[]
  values: number[]
}

interface TopSellingProduct {
  product_id: number
  product_name: string
  total_sold: number
  revenue: number
  price: number
  stock_quantity: number
  image: string | null
}

// Define interface for OrderDetail with nested Order structure
interface OrderDetailWithOrderDate {
  order_id: string
  product_id: number
  quantity: number
  unit_price: number
  subtotal: number
  orders: { order_date: string } | null // Assuming one-to-one relationship returns object or null
}


interface ProductCategory {
  category: string
  count: number
  total_value: number
  avg_price: number
}

interface ProductTrend {
  period: string
  sold_quantity: number
  revenue: number
  avg_price: number
  growth_rate?: number
}

export default function ProductReportsPage() {
  // const router = useRouter() // Removed unused router
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // Refs cho xuất PDF
  const reportRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // State cho bộ lọc
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  
  // State cho dữ liệu
  const [products, setProducts] = useState<Product[]>([])
  const [productSummary, setProductSummary] = useState<ProductSummary>({
    totalProducts: 0,
    totalValue: 0,
    avgPrice: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalSold: 0,
    totalRevenue: 0
  })
  const [salesByCategory, setSalesByCategory] = useState<ChartData>({
    labels: [],
    values: []
  })
  const [stockByCategory, setStockByCategory] = useState<ChartData>({
    labels: [],
    values: []
  })
  const [topSellingProducts, setTopSellingProducts] = useState<TopSellingProduct[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [productTrends, setProductTrends] = useState<ProductTrend[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sales' | 'trends'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Set mounted = true sau khi component được render ở client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cập nhật themeState từ context
  useEffect(() => {
    if (mounted) {
      setThemeState({
        theme: themeContext.currentTheme || themeColors.indigo
      })
      
      // Tải dữ liệu báo cáo khi component đã mounted
      fetchReportData()
    }
  }, [mounted, themeContext.currentTheme])

  // Hàm lấy dữ liệu báo cáo
  const fetchReportData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Lấy danh sách sản phẩm
      let query = supabase
        .from('products')
        .select('*')
        .order('product_name')
      
      // Áp dụng bộ lọc theo giá
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        query = query.gte('price', parseFloat(minPrice))
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        query = query.lte('price', parseFloat(maxPrice))
      }
      
      // Áp dụng bộ lọc theo tồn kho
      if (stockFilter === 'out_of_stock') {
        query = query.eq('stock_quantity', 0)
      } else if (stockFilter === 'low_stock') {
        query = query.lte('stock_quantity', 10).gt('stock_quantity', 0)
      } else if (stockFilter === 'in_stock') {
        query = query.gt('stock_quantity', 10)
      }
      
      // Áp dụng tìm kiếm theo tên
      if (searchTerm) {
        query = query.ilike('product_name', `%${searchTerm}%`)
      }
      
      const { data: productsData, error: productsError } = await query
      
      if (productsError) {
        throw productsError
      }
      
      // Lấy dữ liệu chi tiết đơn hàng để tính số lượng bán
      // Explicitly type the data fetched from Supabase
      const { data: orderDetailsData, error: orderDetailsError } = await supabase
        .from('orderdetails')
        .select(`
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          orders(order_date)
        `)
        .returns<OrderDetailWithOrderDate[]>() // Specify the return type
      
      if (orderDetailsError) {
        console.error('Lỗi khi lấy dữ liệu chi tiết đơn hàng:', orderDetailsError)
      }
      
      // Tính toán số lượng bán và doanh thu cho mỗi sản phẩm
      const productSalesMap = new Map<number, { total_sold: number, revenue: number }>()
      
      if (orderDetailsData) {
        orderDetailsData.forEach(detail => {
          // Kiểm tra nếu có bộ lọc theo ngày
          let includeInStats = true
          
          if (dateRange.from || dateRange.to) {
            // Access order_date using the defined interface (assuming object or null)
            const orderDateStr = detail.orders?.order_date;
            const orderDate = orderDateStr ? new Date(orderDateStr) : null
            
            if (orderDate) {
              if (dateRange.from) {
                const fromDate = new Date(dateRange.from)
                if (orderDate < fromDate) {
                  includeInStats = false
                }
              }
              
              if (dateRange.to) {
                const toDate = new Date(dateRange.to)
                toDate.setHours(23, 59, 59, 999)
                if (orderDate > toDate) {
                  includeInStats = false
                }
              }
            }
          }
          
          if (includeInStats && detail.product_id) {
            const productId = detail.product_id
            const current = productSalesMap.get(productId) || { total_sold: 0, revenue: 0 }
            
            productSalesMap.set(productId, {
              total_sold: current.total_sold + (detail.quantity || 0),
              revenue: current.revenue + (detail.subtotal || 0)
            })
          }
        })
      }
      
      // Kết hợp dữ liệu sản phẩm với dữ liệu bán hàng
      const enrichedProductsData = productsData?.map(product => {
        const salesData = productSalesMap.get(product.product_id) || { total_sold: 0, revenue: 0 }
        return {
          ...product,
          total_sold: salesData.total_sold,
          revenue: salesData.revenue
        }
      }) || []
      
      // Lọc theo danh mục nếu có
      let filteredProducts = [...enrichedProductsData]
      if (categoryFilter !== 'all' && categoryFilter) {
        filteredProducts = filteredProducts.filter(product => 
          product.category === categoryFilter
        )
      }
      
      // Cập nhật state
      setProducts(filteredProducts)
      
      // Trích xuất danh mục từ sản phẩm
      const categorySet = new Set<string>()
      enrichedProductsData.forEach(product => {
        if (product.category) {
          categorySet.add(product.category)
        }
      })
      setCategories(Array.from(categorySet))
      
      // Tính toán các thống kê
      calculateSummary(filteredProducts)
      calculateSalesByCategory(filteredProducts)
      calculateStockByCategory(filteredProducts)
      calculateTopSellingProducts(filteredProducts)
      calculateProductCategories(filteredProducts)
      calculateProductTrends(orderDetailsData || []) // Pass potentially null data
    } catch (error: unknown) { // Type error as unknown
      console.error('Lỗi khi lấy dữ liệu báo cáo:', error)
      let errorMessage = 'Không xác định';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'details' in error) {
         errorMessage = String((error as { details: string }).details); // Handle Supabase specific error structure
      } else if (typeof error === 'string') {
         errorMessage = error;
      }
      setError(`Lỗi khi lấy dữ liệu: ${errorMessage}`)
      setProducts([])
      setProductSummary({
        totalProducts: 0,
        totalValue: 0,
        avgPrice: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalSold: 0,
        totalRevenue: 0
      })
      setSalesByCategory({ labels: [], values: [] })
      setStockByCategory({ labels: [], values: [] })
      setTopSellingProducts([])
      setProductCategories([])
      setProductTrends([])
    } finally {
      setLoading(false)
    }
  }
  
  // Tính toán tổng kết từ dữ liệu sản phẩm
  const calculateSummary = (productsData: Product[]) => {
    const totalProducts = productsData.length
    const totalValue = productsData.reduce((sum, product) => sum + (product.price * product.stock_quantity || 0), 0)
    const avgPrice = totalProducts > 0 ? productsData.reduce((sum, product) => sum + (product.price || 0), 0) / totalProducts : 0
    const lowStockProducts = productsData.filter(product => product.stock_quantity > 0 && product.stock_quantity <= 10).length
    const outOfStockProducts = productsData.filter(product => product.stock_quantity === 0).length
    const totalSold = productsData.reduce((sum, product) => sum + (product.total_sold || 0), 0)
    const totalRevenue = productsData.reduce((sum, product) => sum + (product.revenue || 0), 0)
    
    setProductSummary({
      totalProducts,
      totalValue,
      avgPrice,
      lowStockProducts,
      outOfStockProducts,
      totalSold,
      totalRevenue
    })
  }
  
  // Tính toán doanh số theo danh mục
  const calculateSalesByCategory = (productsData: Product[]) => {
    const categoryMap = new Map<string, number>()
    
    productsData.forEach(product => {
      const category = product.category || 'Không phân loại'
      const revenue = product.revenue || 0
      
      const currentRevenue = categoryMap.get(category) || 0
      categoryMap.set(category, currentRevenue + revenue)
    })
    
    const sortedEntries = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Lấy 6 danh mục có doanh số cao nhất
    
    const labels = sortedEntries.map(([category]) => category) // Use category variable
    const values = sortedEntries.map(([, revenue]) => revenue) // Use revenue variable
    
    setSalesByCategory({
      labels,
      values
    })
  }
  
  // Tính toán tồn kho theo danh mục
  const calculateStockByCategory = (productsData: Product[]) => {
    const categoryMap = new Map<string, number>()
    
    productsData.forEach(product => {
      const category = product.category || 'Không phân loại'
      const stockValue = product.price * product.stock_quantity
      
      const currentValue = categoryMap.get(category) || 0
      categoryMap.set(category, currentValue + stockValue)
    })
    
    const sortedEntries = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Lấy 6 danh mục có giá trị tồn kho cao nhất
    
    const labels = sortedEntries.map(([category]) => category) // Use category variable
    const values = sortedEntries.map(([, value]) => value) // Use value variable
    
    setStockByCategory({
      labels,
      values
    })
  }
  
  // Tính toán sản phẩm bán chạy nhất
  const calculateTopSellingProducts = (productsData: Product[]) => {
    const sortedProducts = [...productsData]
      .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
      .slice(0, 10) // Lấy 10 sản phẩm bán chạy nhất
      .map(product => ({
        product_id: product.product_id,
        product_name: product.product_name,
        total_sold: product.total_sold || 0,
        revenue: product.revenue || 0,
        price: product.price,
        stock_quantity: product.stock_quantity,
        image: product.image
      }))
    
    setTopSellingProducts(sortedProducts)
  }
  
  // Tính toán thống kê theo danh mục
  const calculateProductCategories = (productsData: Product[]) => {
    const categoryMap = new Map<string, { count: number, total_value: number, total_price: number }>()
    
    productsData.forEach(product => {
      const category = product.category || 'Không phân loại'
      
      const current = categoryMap.get(category) || { count: 0, total_value: 0, total_price: 0 }
      categoryMap.set(category, {
        count: current.count + 1,
        total_value: current.total_value + (product.price * product.stock_quantity),
        total_price: current.total_price + product.price
      })
    })
    
    const categoryStats: ProductCategory[] = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      total_value: stats.total_value,
      avg_price: stats.count > 0 ? stats.total_price / stats.count : 0
    }))
    
    // Sắp xếp theo số lượng sản phẩm giảm dần
    const sortedCategories = categoryStats.sort((a, b) => b.count - a.count)
    
    setProductCategories(sortedCategories)
  }
  
  // Tính toán xu hướng sản phẩm theo tháng
  const calculateProductTrends = (orderDetailsData: OrderDetailWithOrderDate[] | null) => { // Use defined interface
    if (!orderDetailsData) {
      setProductTrends([])
      return
    }
    // Nhóm chi tiết đơn hàng theo tháng
    const monthMap = new Map<string, { sold_quantity: number, revenue: number, product_count: number }>()
    
    orderDetailsData.forEach(detail => {
      // Access order_date using the defined interface
      const orderDateStr = detail.orders?.order_date;
      if (!orderDateStr) return
      
      const orderDate = new Date(orderDateStr)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      
      // Kiểm tra nếu có bộ lọc theo ngày
      let includeInStats = true
      
      if (dateRange.from || dateRange.to) {
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from)
          if (orderDate < fromDate) {
            includeInStats = false
          }
        }
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          if (orderDate > toDate) {
            includeInStats = false
          }
        }
      }
      
      if (includeInStats) {
        const current = monthMap.get(monthKey) || { sold_quantity: 0, revenue: 0, product_count: 0 }
        
        monthMap.set(monthKey, {
          sold_quantity: current.sold_quantity + (detail.quantity || 0),
          revenue: current.revenue + (detail.subtotal || 0),
          product_count: current.product_count + 1
        })
      }
    })
    
    // Sắp xếp theo tháng
    const sortedEntries = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    
    // Tính toán xu hướng
    const trends: ProductTrend[] = sortedEntries.map(([monthKey, stats], index) => {
      const [year, month] = monthKey.split('-')
      const period = `${month}/${year}`
      const avg_price = stats.sold_quantity > 0 ? stats.revenue / stats.sold_quantity : 0
      
      // Tính tỷ lệ tăng trưởng so với tháng trước
      let growth_rate: number | undefined = undefined
      if (index > 0) {
        const prevRevenue = sortedEntries[index - 1][1].revenue
        if (prevRevenue > 0) {
          growth_rate = ((stats.revenue - prevRevenue) / prevRevenue) * 100
        }
      }
      
      return {
        period,
        sold_quantity: stats.sold_quantity,
        revenue: stats.revenue,
        avg_price,
        growth_rate
      }
    })
    
    // Lấy 6 tháng gần nhất
    const recentTrends = trends.slice(-6)
    
    setProductTrends(recentTrends)
  }
  
  // Xử lý thay đổi bộ lọc
  const handleDateChange = (field: 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [field]: e.target.value }))
  }
  
  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value)
  }
  
  const handleStockFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStockFilter(e.target.value)
  }
  
  const handlePriceChange = (field: 'min' | 'max') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field === 'min') {
      setMinPrice(e.target.value)
    } else {
      setMaxPrice(e.target.value)
    }
  }
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }
  
  const handleApplyFilters = () => {
    fetchReportData()
  }
  
  const handleResetFilters = () => {
    setDateRange({ from: '', to: '' })
    setCategoryFilter('all')
    setStockFilter('all')
    setMinPrice('')
    setMaxPrice('')
    setSearchTerm('')
    // Gọi lại API để lấy dữ liệu không có bộ lọc
    fetchReportData()
  }
  
  // Xuất báo cáo PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return
    
    setExportingPdf(true)
    
    try {
      // Tạo PDF với kích thước A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      // Sử dụng font Times New Roman cho tiếng Việt
      pdf.setFont("Times", "normal")
      
      // Thêm tiêu đề và thông tin chính thức
      pdf.setFontSize(13)
      pdf.setTextColor(0, 0, 0)
      pdf.setFont("Times", "bold")
      pdf.text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 105, 15, { align: "center" })
      pdf.setLineWidth(0.5)
      pdf.line(60, 17, 150, 17)
      pdf.setFontSize(12)
      pdf.text("Độc lập - Tự do - Hạnh phúc", 105, 23, { align: "center" })
      pdf.line(75, 25, 135, 25)
      
      // Thêm tiêu đề báo cáo
      pdf.setFontSize(16)
      pdf.text("BÁO CÁO TỔNG HỢP SẢN PHẨM", 105, 35, { align: "center" })
      
      // Thêm thông tin thời gian và bộ lọc
      const now = new Date()
      let reportPeriod = "Tất cả thời gian"
      if (dateRange.from && dateRange.to) {
        reportPeriod = `Từ ngày ${dateRange.from} đến ngày ${dateRange.to}`
      } else if (dateRange.from) {
        reportPeriod = `Từ ngày ${dateRange.from}`
      } else if (dateRange.to) {
        reportPeriod = `Đến ngày ${dateRange.to}`
      }
      
      pdf.setFont("Times", "normal")
      pdf.setFontSize(10)
      pdf.text(`Kỳ báo cáo: ${reportPeriod}`, 105, 42, { align: "center" })
      pdf.text(`Ngày xuất báo cáo: ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`, 105, 47, { align: "center" })
      
      if (categoryFilter !== 'all') {
        pdf.text(`Danh mục: ${categoryFilter}`, 105, 52, { align: "center" })
      }
      
      // Thêm thông tin tổng quan
      pdf.setFont("Times", "bold")
      pdf.setFontSize(12)
      pdf.text("I. THÔNG TIN TỔNG QUAN", 20, 60)
      pdf.setLineWidth(0.2)
      pdf.line(20, 62, 80, 62)
      
      pdf.setFont("Times", "normal")
      pdf.setFontSize(10)
      
      // Tạo bảng thông tin tổng quan
      const summaryData = [
        ["Tổng số sản phẩm:", `${productSummary.totalProducts} sản phẩm`],
        ["Tổng giá trị tồn kho:", formatCurrency(productSummary.totalValue)],
        ["Giá trung bình:", formatCurrency(productSummary.avgPrice)],
        ["Sản phẩm sắp hết:", `${productSummary.lowStockProducts} sản phẩm`],
        ["Sản phẩm hết hàng:", `${productSummary.outOfStockProducts} sản phẩm`],
        ["Tổng số đã bán:", `${productSummary.totalSold} sản phẩm`],
        ["Tổng doanh thu:", formatCurrency(productSummary.totalRevenue)]
      ]
      
      let yPos = 68
      summaryData.forEach(row => {
        pdf.text(row[0], 25, yPos)
        pdf.text(row[1], 80, yPos)
        yPos += 7
      })
      
      // Thêm thông tin sản phẩm theo danh mục
      pdf.setFont("Times", "bold")
      pdf.setFontSize(12)
      pdf.text("II. SẢN PHẨM THEO DANH MỤC", 20, yPos + 5)
      pdf.line(20, yPos + 7, 100, yPos + 7)
      
      pdf.setFont("Times", "normal")
      pdf.setFontSize(10)
      yPos += 13
      
      // Hiển thị dữ liệu sản phẩm theo danh mục dạng bảng
      const categoryHeaders = ["Danh mục", "Số lượng", "Giá trị tồn kho", "Giá trung bình"]
      const categoryCellWidth = [50, 30, 50, 30]
      const categoryMargin = 25
      
      // Vẽ header
      pdf.setFillColor(240, 240, 240)
      pdf.rect(categoryMargin, yPos, categoryCellWidth.reduce((a, b) => a + b, 0), 8, 'F')
      
      pdf.setFont("Times", "bold")
      let currentX = categoryMargin
      categoryHeaders.forEach((header, i) => {
        pdf.text(header, currentX + 2, yPos + 5)
        currentX += categoryCellWidth[i]
      })
      
      yPos += 8
      
      // Vẽ dữ liệu danh mục
      pdf.setFont("Times", "normal")
      productCategories.forEach(category => {
        currentX = categoryMargin
        
        const rowData = [
          category.category,
          category.count.toString(),
          formatCurrency(category.total_value),
          formatCurrency(category.avg_price)
        ]
        
        rowData.forEach((cell, i) => {
          pdf.text(cell, currentX + 2, yPos + 5)
          currentX += categoryCellWidth[i]
        })
        
        pdf.setDrawColor(200, 200, 200)
        pdf.line(categoryMargin, yPos, categoryMargin + categoryCellWidth.reduce((a, b) => a + b, 0), yPos)
        
        yPos += 8
      })
      
      // Kiểm tra nếu cần thêm trang mới
      if (yPos > 250) {
        pdf.addPage()
        pdf.setFont("times", "normal")
        yPos = 20
      }
      
      // Thêm thông tin sản phẩm bán chạy
      pdf.setFont("Times", "bold")
      pdf.setFontSize(12)
      pdf.text("III. SẢN PHẨM BÁN CHẠY NHẤT", 20, yPos + 10)
      pdf.line(20, yPos + 12, 100, yPos + 12)
      
      pdf.setFont("Times", "normal")
      pdf.setFontSize(10)
      yPos += 20
      
      // Tạo bảng sản phẩm bán chạy
      const topProductHeaders = ["Sản phẩm", "Đã bán", "Doanh thu", "Tồn kho", "Đơn giá"]
      const topProductCellWidth = [60, 20, 40, 20, 30]
      const topProductMargin = 20
      
      // Vẽ header
      pdf.setFillColor(240, 240, 240)
      pdf.rect(topProductMargin, yPos, topProductCellWidth.reduce((a, b) => a + b, 0), 8, 'F')
      
      pdf.setFont("Times", "bold")
      currentX = topProductMargin
      topProductHeaders.forEach((header, i) => {
        pdf.text(header, currentX + 2, yPos + 5)
        currentX += topProductCellWidth[i]
      })
      
      yPos += 8
      
      // Vẽ dữ liệu sản phẩm bán chạy
      pdf.setFont("Times", "normal")
      topSellingProducts.slice(0, 5).forEach(product => {
        currentX = topProductMargin
        
        const rowData = [
          product.product_name.length > 25 ? product.product_name.substring(0, 22) + '...' : product.product_name,
          product.total_sold.toString(),
          formatCurrency(product.revenue),
          product.stock_quantity.toString(),
          formatCurrency(product.price) // Add missing price formatting
        ]
        
        rowData.forEach((cell, i) => {
          pdf.text(cell, currentX + 2, yPos + 5)
          currentX += topProductCellWidth[i]
        })
        
        pdf.setDrawColor(200, 200, 200)
        pdf.line(topProductMargin, yPos, topProductMargin + topProductCellWidth.reduce((a, b) => a + b, 0), yPos)
        
        yPos += 8
        
        // Kiểm tra nếu cần thêm trang mới
        if (yPos > 270) {
          pdf.addPage()
          pdf.setFont("times", "normal")
          yPos = 20
          
          // Vẽ lại header trên trang mới
          pdf.setFillColor(240, 240, 240)
          pdf.rect(topProductMargin, yPos, topProductCellWidth.reduce((a, b) => a + b, 0), 8, 'F')
          
          pdf.setFont("Times", "bold")
          currentX = topProductMargin
          topProductHeaders.forEach((header, i) => {
            pdf.text(header, currentX + 2, yPos + 5)
            currentX += topProductCellWidth[i]
          })
          
          pdf.setFont("Helvetica", "normal") // Changed from "times"
          yPos += 8
        }
      })

      // Thêm chữ ký
      const signatureY = yPos + 20 > 280 ? 20 : yPos + 20 // Check if new page needed for signature
      if (yPos + 20 > 280) {
         pdf.addPage()
         pdf.setFont("Helvetica", "normal") // Changed from "times"
      }
      pdf.setFont("Times", "bold")
      pdf.text("Người lập báo cáo", 50, signatureY, { align: "center" })
      pdf.text("Người phê duyệt", 160, signatureY, { align: "center" })
      
      pdf.setFont("Times", "italic")
      pdf.setFontSize(10)
      pdf.text("(Ký, ghi rõ họ tên)", 50, signatureY + 7, { align: "center" })
      pdf.text("(Ký, ghi rõ họ tên)", 160, signatureY + 7, { align: "center" })
      
      // Thêm thông tin công ty ở footer
      pdf.setFont("Helvetica", "normal") // Changed from "times"
      pdf.setFontSize(8)
      pdf.text("© Hệ thống quản lý bán hàng - Công ty TNHH ABC", 105, 290, { align: "center" })
      
      // Tạo tên file với timestamp
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
      const filename = `bao_cao_san_pham_${timestamp}.pdf`
      
      // Tải xuống PDF
      pdf.save(filename)
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error)
      alert('Có lỗi xảy ra khi xuất báo cáo PDF. Vui lòng thử lại sau.')
    } finally {
      setExportingPdf(false)
    }
  }
  
  // Xuất bảng dữ liệu sang PDF
  const exportTableToPDF = async () => {
    if (!tableRef.current) return
    
    setExportingPdf(true)
    
    try {
      const tableElement = tableRef.current
      const canvas = await html2canvas(tableElement, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      // Tạo PDF với kích thước A4 landscape
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      
      // Nếu nội dung dài hơn 1 trang
      if (imgHeight > 210) { // A4 landscape height in mm
        let remainingHeight = imgHeight
        let position = 0
        
        // Trang đầu tiên đã được thêm
        remainingHeight -= 210
        position += 210
        
        // Thêm các trang tiếp theo nếu cần
        while (remainingHeight > 0) {
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight)
          remainingHeight -= 210
          position += 210
        }
      }
      
      // Tạo tên file với timestamp
      const now = new Date()
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`
      const filename = `bang_san_pham_${timestamp}.pdf`
      
      // Tải xuống PDF
      pdf.save(filename)
    } catch (error) {
      console.error('Lỗi khi xuất bảng PDF:', error)
      alert('Có lỗi xảy ra khi xuất bảng PDF. Vui lòng thử lại sau.')
    } finally {
      setExportingPdf(false)
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }
  
  // Format ngày tháng (Removed as unused)
  // const formatDate = (dateString: string | null | undefined): string => {
  //   if (!dateString) return 'N/A'
  //   try {
  //     const date = new Date(dateString)
  //     return new Intl.DateTimeFormat('vi-VN', {
  //       day: '2-digit',
  //       month: '2-digit',
  //       year: 'numeric',
  //       hour: '2-digit',
  //       minute: '2-digit'
  //     }).format(date)
  //   } catch (error) { // Catch error variable
  //     console.error("Error formatting date:", error) // Log error
  //     return 'Ngày không hợp lệ'
  //   }
  // }

  // Lấy màu trạng thái tồn kho
  const getStockStatusColor = (quantity: number): string => {
    if (quantity === 0) return 'red'
    if (quantity <= 10) return 'yellow'
    return 'green'
  }

  if (!mounted) {
    return null
  }
  
  const { theme } = themeState
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/reports"
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Báo cáo sản phẩm</h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportToPDF}
            disabled={exportingPdf || loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${(exportingPdf || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            {exportingPdf ? 'Đang xuất...' : 'Xuất báo cáo PDF'}
          </button>
          <button
            onClick={handleResetFilters}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Làm mới
          </button>
        </div>
      </div>
      
      {/* Bộ lọc */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2 text-gray-500" />
            Bộ lọc báo cáo
          </h3>
        </div>
        <div className="px-4 py-5 sm:p-6 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lọc theo khoảng thời gian (cho dữ liệu bán hàng) */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bán từ
              </label>
              <input
                type="date"
                id="date-from"
                value={dateRange.from}
                onChange={handleDateChange('from')}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bán đến
              </label>
              <input
                type="date"
                id="date-to"
                value={dateRange.to}
                onChange={handleDateChange('to')}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
            
            {/* Lọc theo danh mục */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={handleCategoryFilterChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Lọc theo tồn kho */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="stock-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Tình trạng tồn kho
              </label>
              <select
                id="stock-filter"
                value={stockFilter}
                onChange={handleStockFilterChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              >
                <option value="all">Tất cả</option>
                <option value="in_stock">Còn hàng (nhiều)</option>
                <option value="low_stock">Sắp hết hàng</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </div>
            
            {/* Lọc theo giá */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="min-price" className="block text-sm font-medium text-gray-700 mb-2">
                Giá tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                id="min-price"
                value={minPrice}
                onChange={handlePriceChange('min')}
                placeholder="Nhập giá tối thiểu"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm">
              <label htmlFor="max-price" className="block text-sm font-medium text-gray-700 mb-2">
                Giá tối đa (VNĐ)
              </label>
              <input
                type="number"
                id="max-price"
                value={maxPrice}
                onChange={handlePriceChange('max')}
                placeholder="Nhập giá tối đa"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>

            {/* Tìm kiếm theo tên */}
            <div className="bg-white p-3 rounded-md border border-gray-200 shadow-sm col-span-1 md:col-span-2">
              <label htmlFor="search-term" className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm sản phẩm
              </label>
              <input
                type="text"
                id="search-term"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Nhập tên sản phẩm..."
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-10"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleApplyFilters}
              className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>
      
      {/* Nội dung báo cáo */}
      <div ref={reportRef} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {/* Tiêu đề báo cáo */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">BÁO CÁO SẢN PHẨM</h2>
          <p className="text-gray-500 mt-1">
            {dateRange.from && dateRange.to 
              ? `Doanh số từ ngày ${dateRange.from} đến ngày ${dateRange.to}`
              : dateRange.from 
                ? `Doanh số từ ngày ${dateRange.from}` 
                : dateRange.to 
                  ? `Doanh số đến ngày ${dateRange.to}`
                  : 'Doanh số tất cả thời gian'
            }
          </p>
          <p className="text-gray-500 mt-1">
            Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>
        
        {/* Tab điều hướng */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Tổng quan
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('inventory')}
              className={`${
                activeTab === 'inventory'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <ArchiveBoxIcon className="h-5 w-5 mr-2" />
                Tồn kho
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('sales')}
              className={`${
                activeTab === 'sales'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <FireIcon className="h-5 w-5 mr-2" />
                Bán chạy
              </div>
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className={`${
                activeTab === 'trends'
                  ? `border-${themeColor}-500 text-${themeColor}-600`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <div className="flex items-center">
                <PresentationChartLineIcon className="h-5 w-5 mr-2" />
                Xu hướng
              </div>
            </button>
          </nav>
        </div>
        
        {/* Tab Tổng quan */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Thống kê tổng quan */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-gray-500" />
                Thống kê tổng quan
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Tổng số sản phẩm */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-blue-100">
                        <ShoppingBagIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Tổng SP</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{productSummary.totalProducts}</div>
                  </div>
                </div>
                
                {/* Tổng giá trị tồn kho */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-green-100">
                        <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Giá trị tồn kho</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{formatCurrency(productSummary.totalValue)}</div>
                  </div>
                </div>
                
                {/* Giá trung bình */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-blue-100">
                        <TagIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Giá TB</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{formatCurrency(productSummary.avgPrice)}</div>
                  </div>
                </div>
                
                {/* Tổng số đã bán */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-purple-100">
                        <FireIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Đã bán</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{productSummary.totalSold}</div>
                  </div>
                </div>
                
                {/* Tổng doanh thu */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-green-100">
                        <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Doanh thu</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{formatCurrency(productSummary.totalRevenue)}</div>
                  </div>
                </div>

                {/* Sản phẩm sắp hết */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-yellow-100">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Sắp hết</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{productSummary.lowStockProducts}</div>
                  </div>
                </div>
                
                {/* Sản phẩm hết hàng */}
                <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-shrink-0 rounded-md p-2 bg-red-100">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-500">Hết hàng</div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 text-center">{productSummary.outOfStockProducts}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Biểu đồ doanh số theo danh mục */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <TagIcon className="h-5 w-5 mr-2 text-gray-500" />
                Doanh số theo danh mục
              </h3>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {salesByCategory.labels.length > 0 ? (
                  <div className="h-auto">
                    {/* Biểu đồ thanh ngang */}
                    <div className="flex flex-col justify-center space-y-4 py-4">
                      {salesByCategory.labels.map((label, index) => {
                        const value = salesByCategory.values[index]
                        const total = salesByCategory.values.reduce((sum, val) => sum + val, 0)
                        const percentage = total > 0 ? (value / total) * 100 : 0
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500']
                        const color = colors[index % colors.length]
                        
                        return (
                          <div key={label} className="flex flex-col">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{label}</span>
                              <span className="text-sm font-medium text-gray-700">{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div 
                                className={`h-4 rounded-full ${color} shadow-sm`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <p className="text-gray-500">Không có dữ liệu doanh số theo danh mục</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Biểu đồ giá trị tồn kho theo danh mục */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ArchiveBoxIcon className="h-5 w-5 mr-2 text-gray-500" />
                Giá trị tồn kho theo danh mục
              </h3>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {stockByCategory.labels.length > 0 ? (
                  <div className="h-auto">
                    {/* Biểu đồ thanh ngang */}
                    <div className="flex flex-col justify-center space-y-4 py-4">
                      {stockByCategory.labels.map((label, index) => {
                        const value = stockByCategory.values[index]
                        const total = stockByCategory.values.reduce((sum, val) => sum + val, 0)
                        const percentage = total > 0 ? (value / total) * 100 : 0
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500']
                        const color = colors[index % colors.length]
                        
                        return (
                          <div key={label} className="flex flex-col">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{label}</span>
                              <span className="text-sm font-medium text-gray-700">{formatCurrency(value)} ({percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <div 
                                className={`h-4 rounded-full ${color} shadow-sm`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <p className="text-gray-500">Không có dữ liệu tồn kho theo danh mục</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Tồn kho */}
        {activeTab === 'inventory' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <ArchiveBoxIcon className="h-5 w-5 mr-2 text-gray-500" />
                Chi tiết tồn kho
              </h3>
              <button
                onClick={exportTableToPDF}
                disabled={exportingPdf || loading}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500 ${(exportingPdf || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <PrinterIcon className="h-4 w-4 mr-1" />
                {exportingPdf ? 'Đang xuất...' : 'Xuất bảng'}
              </button>
            </div>
            
            <div ref={tableRef} className="bg-white overflow-hidden border border-gray-200 rounded-lg">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : error ? (
                <div className="py-8 px-4 text-center text-red-500">
                  <p>{error}</p>
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có sản phẩm nào phù hợp với bộ lọc</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Danh mục
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đơn giá
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tồn kho
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá trị tồn kho
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.product_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-full object-cover" src={product.image || '/placeholder.png'} alt={product.product_name} />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                                <div className="text-sm text-gray-500">ID: {product.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.category || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.stock_quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(product.price * product.stock_quantity)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getStockStatusColor(product.stock_quantity) === 'green' 
                                ? 'bg-green-100 text-green-800' 
                                : getStockStatusColor(product.stock_quantity) === 'yellow'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock_quantity === 0 ? 'Hết hàng' : product.stock_quantity <= 10 ? 'Sắp hết' : 'Còn hàng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tab Bán chạy */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FireIcon className="h-5 w-5 mr-2 text-gray-500" />
              Top 10 sản phẩm bán chạy nhất
            </h3>
            
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              {topSellingProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hạng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sản phẩm
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số lượng bán
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doanh thu
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tồn kho
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đơn giá
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topSellingProducts.map((product, index) => (
                        <tr key={product.product_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              index < 3 ? `bg-${themeColor}-100 text-${themeColor}-800` : 'bg-gray-100 text-gray-800'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-full object-cover" src={product.image || '/placeholder.png'} alt={product.product_name} />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.product_name}</div>
                                <div className="text-sm text-gray-500">ID: {product.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.total_sold}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(product.revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.stock_quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(product.price)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có dữ liệu sản phẩm bán chạy</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tab Xu hướng */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <PresentationChartLineIcon className="h-5 w-5 mr-2 text-gray-500" />
              Xu hướng bán hàng theo tháng
            </h3>
            
            <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              {productTrends.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tháng
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số lượng bán
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doanh thu
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Giá bán trung bình
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tăng trưởng
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productTrends.map((trend, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{trend.period}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{trend.sold_quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(trend.revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(trend.avg_price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {trend.growth_rate !== undefined ? (
                              <div className={`text-sm font-medium ${trend.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.growth_rate >= 0 ? '+' : ''}{trend.growth_rate.toFixed(1)}%
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-gray-500">
                  <p>Không có dữ liệu xu hướng bán hàng</p>
                </div>
              )}
            </div>
            
            {/* Biểu đồ xu hướng */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {productTrends.length > 0 ? (
                <div className="h-64 flex items-end space-x-2">
                  {productTrends.map((trend, index) => {
                    const maxRevenue = Math.max(...productTrends.map(t => t.revenue))
                    const height = maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full ${trend.growth_rate !== undefined && trend.growth_rate >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-t`} 
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className="text-xs mt-1 text-gray-600">{trend.period}</div>
                        <div className="text-xs font-medium text-gray-900">{formatCurrency(trend.revenue)}</div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">Không có dữ liệu xu hướng bán hàng</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
