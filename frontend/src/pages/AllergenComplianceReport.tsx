import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { menuService } from '../services/menuService';
import ProfileDropdown from '../components/ProfileDropdown';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

interface MenuItem {
  _id: string;
  name: string;
  allergens?: { _id: string; name: string }[] | string[];
}

const AllergenComplianceReport: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = localStorage.getItem('userName') || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userEmail = localStorage.getItem('userEmail') || '';

  useEffect(() => {
    let cancelled = false;
    menuService
      .getAllItems()
      .then((res) => {
        if (!cancelled) setMenuItems(res?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setMenuItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const totalDishes = menuItems.length;
  const withAllergens = menuItems.filter((m) => m.allergens && Array.isArray(m.allergens));
  const fullyTagged = withAllergens.length;
  const needAttention = totalDishes - fullyTagged;

  const getStatus = (item: MenuItem) => {
    if (!item.allergens || !Array.isArray(item.allergens)) return 'Not tagged';
    return 'Fully tagged';
  };

  const getAllergenNames = (item: MenuItem): string[] => {
    const list = item.allergens;
    if (!Array.isArray(list)) return [];
    return list.map((a) => (typeof a === 'string' ? a : (a as { name: string }).name)).filter(Boolean);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePdf = () => {
    if (loading) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const lineH = 5;
      const bottomSafe = 16;
      let y = margin;

      const newPage = () => {
        doc.addPage();
        y = margin;
      };

      const fitBlock = (heightMm: number) => {
        if (y + heightMm > pageH - bottomSafe) newPage();
      };

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Allergen Compliance Report', margin, y);
      y += lineH + 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.text('UK Food Information Regulations 2014', margin, y);
      y += lineH + 1;
      doc.text(
        `${restaurantName} · Generated ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}`,
        margin,
        y
      );
      y += lineH + 6;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, y);
      y += lineH + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total dishes: ${totalDishes}`, margin, y);
      y += lineH + 1;
      doc.text(`Fully tagged: ${fullyTagged}`, margin, y);
      y += lineH + 1;
      doc.text(`Need attention: ${needAttention}`, margin, y);
      y += lineH + 5;

      doc.setFont('helvetica', 'bold');
      doc.text('Dishes and allergen status', margin, y);
      y += lineH + 3;
      doc.setFont('helvetica', 'normal');

      const textW = pageW - 2 * margin;
      if (menuItems.length === 0) {
        fitBlock(lineH * 2);
        doc.text('No menu items yet.', margin, y);
        y += lineH * 2;
      } else {
        for (const item of menuItems) {
          const status = getStatus(item);
          const names = getAllergenNames(item).join(', ') || '—';
          const dishLines = doc.splitTextToSize(item.name, textW);
          const detailLines = doc.splitTextToSize(`Status: ${status} · Allergens: ${names}`, textW);
          const blockH = dishLines.length * lineH + 2 + detailLines.length * lineH + 4;
          fitBlock(blockH);

          doc.setFont('helvetica', 'bold');
          for (const line of dishLines) {
            doc.text(line, margin, y);
            y += lineH;
          }
          doc.setFont('helvetica', 'normal');
          for (const line of detailLines) {
            doc.text(line, margin, y);
            y += lineH;
          }
          y += 3;
        }
      }

      const disclaimer =
        'Use this report for your records or to demonstrate allergen information practices. Keep menu allergen data up to date for customer safety and regulatory compliance.';
      const footLines = doc.splitTextToSize(disclaimer, textW);
      fitBlock(footLines.length * lineH + 4);
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      for (const line of footLines) {
        doc.text(line, margin, y);
        y += lineH - 0.5;
      }

      const safeName = restaurantName.replace(/[^\w-]+/g, '-').slice(0, 48) || 'restaurant';
      const dateSlug = new Date().toISOString().slice(0, 10);
      doc.save(`allergen-compliance-${safeName}-${dateSlug}.pdf`);
      toast.success('Report downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Could not create the PDF. Try again or use Print.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 no-print">
        <div className="flex items-center justify-between px-6 py-4">
          <AppHeaderBranding title="Smart Menu" subtitle="Compliance Report" />
          <WorkspaceContextBar restaurantName={restaurantName} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12v9m0-9l4 4m-4-4L8 16" />
              </svg>
              Save PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print report
            </button>
            <ProfileDropdown userName={userName} userEmail={userEmail} restaurantName={restaurantName} />
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 print:p-0">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-0">
          <div className="p-6 md:p-8 print:p-8">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Allergen Compliance Report</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">UK Food Information Regulations 2014</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {restaurantName} · Generated {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total dishes</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalDishes}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fully tagged</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{fullyTagged}</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Need attention</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{needAttention}</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Dishes and allergen status</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="py-3 pr-4 font-semibold text-gray-800 dark:text-white">Dish</th>
                        <th className="py-3 pr-4 font-semibold text-gray-800 dark:text-white">Status</th>
                        <th className="py-3 font-semibold text-gray-800 dark:text-white">Allergens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuItems.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-500 dark:text-gray-400">
                            No menu items yet.
                          </td>
                        </tr>
                      ) : (
                        menuItems.map((item) => (
                          <tr key={item._id} className="border-b border-gray-100 dark:border-gray-700">
                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white">{item.name}</td>
                            <td className="py-3 pr-4">
                              <span
                                className={
                                  getStatus(item) === 'Fully tagged'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }
                              >
                                {getStatus(item)}
                              </span>
                            </td>
                            <td className="py-3 text-gray-600 dark:text-gray-300">
                              {getAllergenNames(item).length > 0
                                ? getAllergenNames(item).join(', ')
                                : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                  Use this report for your records or to demonstrate allergen information practices. Keep menu allergen data up to date for customer safety and regulatory compliance.
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default AllergenComplianceReport;
