'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, themeColors } from '@/app/context/ThemeContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  MinusIcon, 
  TrashIcon,
  UserIcon
} from '@heroicons/react/24/outline'

// Định nghĩa các interface
interface Product {
  product_id: string
  product_name: string
  price: number
  stock_quantity: number
  color: string
  size: string
  image: string | null
}

interface OrderItem {
  product: Product
  quantity: number
  price: number
}

interface Customer {
  customer_id?: string
  name: string
  phone: string
  address: string
  email: string
}

interface Order {
  id: string
  name: string
  items: OrderItem[]
  customer: Customer | null
  total: number
  created_at: string
}

export default function CreateOrderPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [mounted, setMounted] = useState(false)
  const themeContext = useTheme()
  const [themeState, setThemeState] = useState({
    theme: themeColors.indigo
  })

  // State cho đơn hàng
  const [orders, setOrders] = useState<Order[]>([])
  const [activeOrderIndex, setActiveOrderIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  // State cho khách hàng
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    phone: '',
    address: '',
    email: ''
  })
  
  // State cho người dùng hiện tại
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // State cho thông báo
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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
      
      // Tạo đơn hàng mặc định
      if (orders.length === 0) {
        createNewOrder()
      }
      
      // Lấy thông tin người dùng hiện tại
      getCurrentUser()
    }
  }, [mounted, themeContext.currentTheme])

  // Lấy thông tin người dùng hiện tại
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single()
          
        if (error) throw error
        
        setCurrentUser(userData)
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng:', error)
    }
  }

  // Tạo đơn hàng mới
  const createNewOrder = () => {
    const newOrder: Order = {
      id: `ORDER-${Date.now()}`,
      name: `Đơn hàng ${orders.length + 1}`,
      items: [],
      customer: null,
      total: 0,
      created_at: new Date().toISOString()
    }
    
    setOrders([...orders, newOrder])
    setActiveOrderIndex(orders.length)
  }

  // Tìm kiếm sản phẩm
  const searchProducts = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`product_name.ilike.%${searchTerm}%, product_id.eq.${searchTerm}`)
        .order('product_name', { ascending: true })
        
      if (error) throw error
      
      setSearchResults(data || [])
      setShowSearchResults(true)
    } catch (error) {
      console.error('Lỗi khi tìm kiếm sản phẩm:', error)
      setError('Có lỗi xảy ra khi tìm kiếm sản phẩm')
    }
  }

  // Thêm sản phẩm vào đơn hàng
  const addProductToOrder = (product: Product) => {
    const updatedOrders = [...orders]
    const currentOrder = updatedOrders[activeOrderIndex]
    
    // Kiểm tra xem sản phẩm đã có trong đơn hàng chưa
    const existingItemIndex = currentOrder.items.findIndex(
      item => item.product.product_id === product.product_id
    )
    
    if (existingItemIndex >= 0) {
      // Nếu sản phẩm đã có, tăng số lượng
      currentOrder.items[existingItemIndex].quantity += 1
    } else {
      // Nếu sản phẩm chưa có, thêm mới
      currentOrder.items.push({
        product,
        quantity: 1,
        price: product.price
      })
    }
    
    // Cập nhật tổng tiền
    currentOrder.total = calculateTotal(currentOrder.items)
    
    setOrders(updatedOrders)
    setShowSearchResults(false)
    setSearchTerm('')
  }

  // Tính tổng tiền
  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  // Cập nhật số lượng sản phẩm
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return
    
    const updatedOrders = [...orders]
    const currentOrder = updatedOrders[activeOrderIndex]
    
    // Kiểm tra tồn kho
    if (newQuantity > currentOrder.items[index].product.stock_quantity) {
      setError(`Số lượng vượt quá tồn kho (${currentOrder.items[index].product.stock_quantity})`)
      return
    }
    
    currentOrder.items[index].quantity = newQuantity
    currentOrder.total = calculateTotal(currentOrder.items)
    
    setOrders(updatedOrders)
  }

  // Xóa sản phẩm khỏi đơn hàng
  const removeProduct = (index: number) => {
    const updatedOrders = [...orders]
    const currentOrder = updatedOrders[activeOrderIndex]
    
    currentOrder.items.splice(index, 1)
    currentOrder.total = calculateTotal(currentOrder.items)
    
    setOrders(updatedOrders)
  }

  // Cập nhật thông tin khách hàng
  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCustomer({
      ...customer,
      [name]: value
    })
    
    // Cập nhật thông tin khách hàng vào đơn hàng
    const updatedOrders = [...orders]
    updatedOrders[activeOrderIndex].customer = {
      ...customer,
      [name]: value
    }
    setOrders(updatedOrders)
  }

  // Lưu đơn hàng
  const saveOrder = async () => {
    try {
      const currentOrder = orders[activeOrderIndex]
      
      // Kiểm tra đơn hàng có sản phẩm không
      if (currentOrder.items.length === 0) {
        setError('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng')
        return
      }
      
      // Kiểm tra thông tin khách hàng
      if (!currentOrder.customer || !currentOrder.customer.name || !currentOrder.customer.phone) {
        setError('Vui lòng nhập tên và số điện thoại của khách hàng')
        return
      }
      
      // TODO: Lưu đơn hàng vào cơ sở dữ liệu
      
      setSuccessMessage('Đơn hàng đã được lưu thành công')
      
      // Tự động ẩn thông báo sau 3 giây
      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Lỗi khi lưu đơn hàng:', error)
      setError('Có lỗi xảy ra khi lưu đơn hàng')
    }
  }

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  if (!mounted) {
    return null
  }

  const { theme } = themeState
  // Đảm bảo theme có giá trị trước khi sử dụng
  const themeColor = theme && theme.textColor ? theme.textColor.split('-')[1] : 'indigo'
  
  const activeOrder = orders[activeOrderIndex] || null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Thông báo thành công */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Thông báo lỗi */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md flex items-center">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tạo đơn hàng</h1>

      {/* Thanh ngang phía trên */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4 flex items-center justify-between">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
              className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300 pl-10 pr-3`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={searchProducts}
              className={`absolute inset-y-0 right-0 px-3 flex items-center bg-${themeColor}-600 text-white rounded-r-md hover:bg-${themeColor}-700`}
            >
              Tìm
            </button>
            
            {/* Kết quả tìm kiếm */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute mt-1 w-full bg-white shadow-lg rounded-md z-10 max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <div
                    key={product.product_id}
                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => addProductToOrder(product)}
                  >
                    {product.image ? (
                      <img src={product.image} alt={product.product_name} className="w-10 h-10 object-cover mr-2" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 flex items-center justify-center mr-2">
                        <span className="text-xs text-gray-500">No img</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{product.product_name}</div>
                      <div className="text-sm text-gray-500">
                        {product.color && product.size ? `${product.color} - ${product.size}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatCurrency(product.price)}</div>
                      <div className="text-sm text-gray-500">Tồn: {product.stock_quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {orders.map((order, index) => (
                <button
                  key={order.id}
                  onClick={() => setActiveOrderIndex(index)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    index === activeOrderIndex
                      ? `bg-${themeColor}-600 text-white`
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {order.name}
                </button>
              ))}
              <button
                onClick={createNewOrder}
                className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Nội dung chính */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Phần bên trái - Danh sách sản phẩm (3/5) */}
        <div className="md:w-3/5 bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Sản phẩm trong đơn hàng</h2>
          
          {activeOrder && activeOrder.items.length > 0 ? (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sản phẩm
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giá bán
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành tiền
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeOrder.items.map((item, index) => (
                      <tr key={`${item.product.product_id}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.product.image ? (
                              <img src={item.product.image} alt={item.product.product_name} className="w-10 h-10 object-cover mr-2" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 flex items-center justify-center mr-2">
                                <span className="text-xs text-gray-500">No img</span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.product.product_name}</div>
                              <div className="text-sm text-gray-500">
                                {item.product.color && item.product.size ? `${item.product.color} - ${item.product.size}` : ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                Tồn kho: {item.product.stock_quantity}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(item.price)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.product.stock_quantity}
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-12 h-8 border border-gray-300 rounded-md text-center focus:ring-0 focus:border-gray-300"
                            />
                            <button
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              className="p-1 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => removeProduct(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center text-lg font-medium text-gray-900">
                  <span>Tổng tiền:</span>
                  <span>{formatCurrency(activeOrder.total)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <p>Chưa có sản phẩm nào trong đơn hàng</p>
              <p className="mt-2 text-sm">Tìm kiếm và thêm sản phẩm vào đơn hàng</p>
            </div>
          )}
        </div>
        
        {/* Phần bên phải - Thông tin khách hàng (2/5) */}
        <div className="md:w-2/5 bg-white shadow rounded-lg p-4">
          {/* Thông tin người bán */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Thông tin người bán</h2>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-gray-700">
                {currentUser ? currentUser.full_name : 'Đang tải...'}
              </span>
            </div>
          </div>
          
          {/* Thông tin khách hàng */}
          <h2 className="text-lg font-medium text-gray-900 mb-4">Thông tin khách hàng</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={customer.name}
                onChange={handleCustomerChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300`}
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={customer.phone}
                onChange={handleCustomerChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300`}
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={customer.email}
                onChange={handleCustomerChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300`}
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={customer.address}
                onChange={handleCustomerChange}
                className={`block w-full rounded-md focus:ring-${themeColor}-500 focus:border-${themeColor}-500 h-10 border border-gray-300`}
              />
            </div>
          </div>
          
          {/* Nút lưu đơn hàng */}
          <div className="mt-6">
            <button
              onClick={saveOrder}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
            >
              Lưu đơn hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
