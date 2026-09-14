import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportJsonToExcel } from '@/lib/excel';

describe('Excel Utility', () => {
  beforeEach(() => {
    // Mock browser globals for Blob & ObjectURL
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  it('exports JSON data to an Excel file and triggers download', async () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const clickSpy = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    const testData = [
      { name: 'Product 1', sku: 'SKU001', price: 1000 },
      { name: 'Product 2', sku: 'SKU002', price: 2000 },
    ];

    await exportJsonToExcel({
      filename: 'test-inventory.xlsx',
      sheetName: 'Products',
      data: testData,
    });

    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
  });
});
