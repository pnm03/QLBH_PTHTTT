// app/dashboard/reports/shipping/ShippingReportClient.tsx
'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import ProductShippingDetailsPopup from '../../../../components/shipping/ProductShippingDetailsPopup';

// Define the props type based on data passed from the server component
interface TopProduct {
  name: string;
  count: number;
}

interface ShippingReportClientProps {
  totalShipments: number;
  successfulShipments: number;
  successRate: number;
  deliveredShipments: number;
  deliverySuccessRate: number;
  topProducts: TopProduct[];
  totalError: string | null;
  successError: string | null;
  productError: string | null;
  deliveredError: string | null;
}

// Helper to format date for PDF filename
const getFormattedDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export default function ShippingReportClient({
  totalShipments,
  successfulShipments,
  successRate,
  deliveredShipments,
  deliverySuccessRate,
  topProducts,
  totalError,
  successError,
  productError,
  deliveredError,
}: ShippingReportClientProps) {
  // Add loading states
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // State for product shipping details popup
  const [selectedProduct, setSelectedProduct] = React.useState<string | null>(null);
  const [showProductShippingDetails, setShowProductShippingDetails] = React.useState(false);

  // Simulate loading state for better UX
  React.useEffect(() => {
    // Set loading to false after a short delay to show the loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Hàm xử lý khi người dùng nhấp vào một sản phẩm
  const handleProductClick = (productName: string) => {
    setSelectedProduct(productName);
    setShowProductShippingDetails(true);
  };

  // Hàm đóng popup
  const handleClosePopup = () => {
    setShowProductShippingDetails(false);
    setSelectedProduct(null);
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // --- Add Font (Important for Vietnamese characters) ---
      // For simplicity, we'll use ASCII equivalents for Vietnamese characters
      // A better solution would be to embed a Vietnamese font
      doc.setFont('helvetica', 'normal');

      // --- Add Header with Logo (if available) ---
      // Add a colored header bar
      doc.setFillColor(41, 128, 185); // Blue header
      doc.rect(0, 0, 210, 20, 'F');

      // Add title in white text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('BAO CAO VAN CHUYEN', 105, 12, { align: 'center' });

      // --- Add Report Information ---
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(`Ngay tao: ${new Date().toLocaleDateString('vi-VN')}`, 20, 30);
      doc.text(`Tong so don: ${isNaN(totalShipments) ? 0 : totalShipments}`, 20, 36);
      doc.text(`Don da thanh toan: ${isNaN(successfulShipments) ? 0 : successfulShipments}`, 20, 42);
      doc.text(`Ty le thanh toan: ${isNaN(successRate) ? '0.0' : successRate.toFixed(1)}%`, 20, 48);
      doc.text(`Don da giao hang: ${isNaN(deliveredShipments) ? 0 : deliveredShipments}`, 20, 54);
      doc.text(`Ty le giao thanh cong: ${isNaN(deliverySuccessRate) ? '0.0' : deliverySuccessRate.toFixed(1)}%`, 20, 60);

      // --- Add Divider ---
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 65, 190, 65);

      // --- Key Metrics Table ---
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('THONG KE TONG QUAN', 105, 75, { align: 'center' });

      // Manually create a table
      const startY = 80;
      const cellPadding = 5;
      const colWidth1 = 70;
      const colWidth2 = 50;
      const rowHeight = 10;
      const tableX = 40;

      // Table headers
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.rect(tableX, startY, colWidth1, rowHeight, 'F');
      doc.rect(tableX + colWidth1, startY, colWidth2, rowHeight, 'F');
      doc.text('Chi Tieu', tableX + cellPadding, startY + rowHeight - cellPadding);
      doc.text('So Luong', tableX + colWidth1 + colWidth2/2, startY + rowHeight - cellPadding, { align: 'center' });

      // Table rows
      const rows = [
        ['Tong don van chuyen', isNaN(totalShipments) ? '0' : totalShipments.toString()],
        ['Don da thanh toan', isNaN(successfulShipments) ? '0' : successfulShipments.toString()],
        ['Ty le thanh toan (%)', isNaN(successRate) ? '0.0' : successRate.toFixed(1)],
        ['Don da giao hang', isNaN(deliveredShipments) ? '0' : deliveredShipments.toString()],
        ['Ty le giao thanh cong (%)', isNaN(deliverySuccessRate) ? '0.0' : deliverySuccessRate.toFixed(1)]
      ];

      // Draw rows
      doc.setTextColor(0);
      doc.setFontSize(10);

      rows.forEach((row, i) => {
        const y = startY + (i + 1) * rowHeight;

        // Draw cell backgrounds and borders
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.rect(tableX, y, colWidth1, rowHeight, 'FD');
        doc.rect(tableX + colWidth1, y, colWidth2, rowHeight, 'FD');

        // Draw text
        doc.setFont('helvetica', 'bold');
        doc.text(row[0], tableX + cellPadding, y + rowHeight - cellPadding);

        doc.setFont('helvetica', 'normal');
        doc.text(row[1], tableX + colWidth1 + colWidth2/2, y + rowHeight - cellPadding, { align: 'center' });
      });

      // --- Top Products Table ---
      // Calculate the final Y position from the previous table
      const finalY = startY + (rows.length + 1) * rowHeight + 5;
      const tableStartY = finalY + 15;
      doc.setFontSize(12);
      doc.text('TOP SAN PHAM VAN CHUYEN NHIEU NHAT', 105, tableStartY, { align: 'center' });

      // Manually create the second table
      const productTableStartY = tableStartY + 5;
      const prodColWidth0 = 10;  // # column
      const prodColWidth1 = 120; // Product name column
      const prodColWidth2 = 40;  // Count column
      const productTableX = 20;

      // Table headers
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');

      // Draw header cells
      doc.rect(productTableX, productTableStartY, prodColWidth0, rowHeight, 'F');
      doc.rect(productTableX + prodColWidth0, productTableStartY, prodColWidth1, rowHeight, 'F');
      doc.rect(productTableX + prodColWidth0 + prodColWidth1, productTableStartY, prodColWidth2, rowHeight, 'F');

      // Header text
      doc.text('#', productTableX + prodColWidth0/2, productTableStartY + rowHeight - cellPadding, { align: 'center' });
      doc.text('Ten San Pham', productTableX + prodColWidth0 + cellPadding, productTableStartY + rowHeight - cellPadding);
      doc.text('So Luot Van Chuyen', productTableX + prodColWidth0 + prodColWidth1 + prodColWidth2/2, productTableStartY + rowHeight - cellPadding, { align: 'center' });

      // Draw rows
      doc.setTextColor(0);
      doc.setFontSize(10);

      // Process product names to handle Vietnamese characters
      const processedProducts = topProducts.map(product => ({
        ...product,
        processedName: product.name
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/đ/g, "d").replace(/Đ/g, "D") // Replace đ/Đ
      }));

      processedProducts.forEach((product, i) => {
        const y = productTableStartY + (i + 1) * rowHeight;
        const isEven = i % 2 === 0;

        // Draw cell backgrounds and borders
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(isEven ? 255 : 245, isEven ? 255 : 245, isEven ? 255 : 245);

        // Draw cells
        doc.rect(productTableX, y, prodColWidth0, rowHeight, 'FD');
        doc.rect(productTableX + prodColWidth0, y, prodColWidth1, rowHeight, 'FD');
        doc.rect(productTableX + prodColWidth0 + prodColWidth1, y, prodColWidth2, rowHeight, 'FD');

        // Draw text
        doc.setFont('helvetica', 'normal');
        doc.text((i + 1).toString(), productTableX + prodColWidth0/2, y + rowHeight - cellPadding, { align: 'center' });

        // Product name - truncate if too long
        const maxChars = 40;
        const displayName = product.processedName.length > maxChars
          ? product.processedName.substring(0, maxChars) + '...'
          : product.processedName;
        doc.text(displayName, productTableX + prodColWidth0 + cellPadding, y + rowHeight - cellPadding);

        // Count
        doc.text(product.count.toString(), productTableX + prodColWidth0 + prodColWidth1 + prodColWidth2/2, y + rowHeight - cellPadding, { align: 'center' });
      });

      // --- Add Footer ---
      // Get the number of pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);

        // Get page width and height
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Add page number
        doc.text(
          `Trang ${i} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );

        // Add footer text
        doc.text(
          `Bao cao duoc tao tu he thong QLBH - ${new Date().toLocaleDateString('vi-VN')}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // --- Save PDF ---
      doc.save(`BaoCaoVanChuyen_${getFormattedDate()}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi khi tạo file PDF. Vui lòng thử lại sau.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <>
      {/* Show loading state */}
      {isLoading ? (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Đang tải báo cáo vận chuyển...</p>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-800">Báo cáo Vận chuyển</h1>
            <button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isGeneratingPDF ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isGeneratingPDF ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo PDF...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Tải PDF
                </>
              )}
            </button>
          </div>

          {/* Display Errors */}
          {totalError && <div role="alert" className="rounded border-s-4 border-red-500 bg-red-50 p-4 mb-4"><p className="text-sm text-red-700"><strong>Lỗi tải tổng đơn:</strong> {totalError}</p></div>}
          {successError && <div role="alert" className="rounded border-s-4 border-red-500 bg-red-50 p-4 mb-4"><p className="text-sm text-red-700"><strong>Lỗi tải đơn đã thanh toán:</strong> {successError}</p></div>}
          {deliveredError && <div role="alert" className="rounded border-s-4 border-red-500 bg-red-50 p-4 mb-4"><p className="text-sm text-red-700"><strong>Lỗi tải đơn đã giao hàng:</strong> {deliveredError}</p></div>}
          {productError && <div role="alert" className="rounded border-s-4 border-red-500 bg-red-50 p-4 mb-4"><p className="text-sm text-red-700"><strong>Lỗi tải sản phẩm:</strong> {productError}</p></div>}

          {/* Section: Key Metrics - Improved UI */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tổng đơn vận chuyển</h2>
              <p className="text-3xl font-semibold text-gray-900">{isNaN(totalShipments) ? 0 : totalShipments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Đơn đã thanh toán</h2>
              <p className="text-3xl font-semibold text-green-600">{isNaN(successfulShipments) ? 0 : successfulShipments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tỷ lệ thanh toán</h2>
              <p className="text-3xl font-semibold text-blue-600">{isNaN(successRate) ? '0.0' : successRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Đơn đã giao hàng</h2>
              <p className="text-3xl font-semibold text-orange-600">{isNaN(deliveredShipments) ? 0 : deliveredShipments}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <h2 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Tỷ lệ giao thành công</h2>
              <p className="text-3xl font-semibold text-purple-600">{isNaN(deliverySuccessRate) ? '0.0' : deliverySuccessRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Section: Top Shipped Products - Enhanced UI (Table) */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
              Top Sản phẩm được vận chuyển nhiều nhất
            </h2>
            {topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên Sản phẩm
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Số lượt vận chuyển
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr
                        key={index}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150 cursor-pointer`}
                        onClick={() => handleProductClick(product.name)}
                      >
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-b border-gray-200">
                          {index + 1}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800 border-b border-gray-200">
                          {product.name}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-800 text-right font-medium border-b border-gray-200">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                            {product.count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="mt-4 text-center text-gray-500">Chưa có dữ liệu sản phẩm để hiển thị.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popup hiển thị chi tiết đơn vận chuyển của sản phẩm */}
      {showProductShippingDetails && selectedProduct && (
        <ProductShippingDetailsPopup
          productName={selectedProduct}
          onClose={handleClosePopup}
          themeColor="indigo"
        />
      )}
    </>
  );
}
