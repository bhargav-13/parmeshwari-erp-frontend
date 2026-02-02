import React, { useEffect, useMemo, useState } from 'react';
import type { Order, OrderProductRequest, OrderRequest, StockItem, OrderQuantityUnit } from '../types';
import { OrderFloor } from '../types';
import { stockItemApi } from '../api/inventory';
import './AddOrderModal.css';
import DeleteIcon from '../assets/delete.svg';

interface AddOrderModalProps {
  onClose: () => void;
  onSubmit: (payload: OrderRequest) => Promise<void>;
  initialData?: Order | null;
  fixedFloor?: OrderFloor;
}

type ActiveTab = 'order' | 'lineItems';

const createEmptyProduct = (): OrderProductRequest => ({
  itemId: 0,
  productName: '',
  quantityUnit: 'kg',
  quantityKg: 0,
  quantityPc: 0,
  marketRate: 0,
  rateDifference: 0,
  totalAmount: 0,
});

const normalizeInitialData = (initialData?: Order | null, fixedFloor?: OrderFloor): OrderRequest => {
  if (!initialData) {
    return {
      customerName: '',
      customerMobileNo: '',
      customerEmail: '',
      orderDate: '',
      expectedDeliveryDate: '',
      paymentDate: '',
      totalItems: 0,
      orderFloor: fixedFloor || OrderFloor.GROUND_FLOOR,
      offlineBillPercent: 0,
      offlineTotal: 0,
      officialBillAmount: 0,
      gst: 0,
      grandTotal: 0,
      productsTotal: 0,
      products: [createEmptyProduct()],
    };
  }

  const { id, orderStatus, products, ...rest } = initialData;
  return {
    ...rest,
    orderFloor: fixedFloor || rest.orderFloor,
    products:
      products && products.length
        ? products.map(({ id: productId, ...item }) => ({
          ...item,
        }))
        : [createEmptyProduct()],
  };
};

const recalculateTotals = (data: OrderRequest): OrderRequest => {
  const productsTotal = data.products.reduce((sum, product) => sum + (Number(product.totalAmount) || 0), 0);
  const offlineBillPercent = Number(data.offlineBillPercent) || 0;
  const offlineTotal = (offlineBillPercent / 100) * productsTotal;
  const officialBillAmount = Math.max(productsTotal - offlineTotal, 0);
  const gst = officialBillAmount * 0.18;
  const grandTotal = offlineTotal + officialBillAmount + gst;

  return {
    ...data,
    productsTotal: Number(productsTotal.toFixed(2)),
    offlineTotal: Number(offlineTotal.toFixed(2)),
    officialBillAmount: Number(officialBillAmount.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    totalItems: data.products.length,
  };
};

const AddOrderModal: React.FC<AddOrderModalProps> = ({ onClose, onSubmit, initialData, fixedFloor }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('order');
  const [formData, setFormData] = useState<OrderRequest>(() => recalculateTotals(normalizeInitialData(initialData, fixedFloor)));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        setStockItemsLoading(true);
        const items = await stockItemApi.getAllStockItems();
        setStockItems(items);
      } catch (err) {
        console.error('Failed to fetch stock items', err);
      } finally {
        setStockItemsLoading(false);
      }
    };
    fetchStockItems();
  }, []);

  const updateFormData = (updater: (prev: OrderRequest) => OrderRequest) => {
    setFormData((prev) => recalculateTotals(updater(prev)));
  };

  const handleFieldChange = (field: keyof OrderRequest, value: string | number) => {
    updateFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProductChange = (index: number, field: keyof OrderProductRequest, value: string | number) => {
    updateFormData((prev) => {
      const products = prev.products.map((product, idx) => {
        if (idx !== index) return product;

        const updated: OrderProductRequest = {
          ...product,
          [field]: value,
        };

        // When switching unit, reset the quantity fields and rate fields appropriately
        if (field === 'quantityUnit') {
          const unit = value as OrderQuantityUnit;
          if (unit === 'pc') {
            updated.quantityKg = 0;
            // For pc: we now use marketRate as "Price Per Pc"
            // Reset rateDifference as it doesn't apply to Pc usually, or user didn't ask for it
            updated.rateDifference = 0;
            updated.totalAmount = (updated.quantityPc || 0) * (updated.marketRate || 0);
          } else {
            updated.quantityPc = 0;
            // For kg: recalculate based on existing kg fields
            const qty = updated.quantityKg || 0;
            const market = updated.marketRate || 0;
            const diff = updated.rateDifference || 0;
            updated.totalAmount = Number(((market + diff) * qty).toFixed(2));
          }
        }

        const unit = updated.quantityUnit || 'kg';

        if (unit === 'kg') {
          if (field === 'quantityKg' || field === 'marketRate' || field === 'rateDifference') {
            const qty = Number(field === 'quantityKg' ? value : updated.quantityKg) || 0;
            const market = Number(field === 'marketRate' ? value : updated.marketRate) || 0;
            const diff = Number(field === 'rateDifference' ? value : updated.rateDifference) || 0;
            updated.totalAmount = Number(((market + diff) * qty).toFixed(2));
          }
        } else if (unit === 'pc') {
          // Logic for Pc: Total = Quantity * Price Per Pc (stored in marketRate)
          if (field === 'quantityPc' || field === 'marketRate') {
            const qty = Number(field === 'quantityPc' ? value : updated.quantityPc) || 0;
            const pricePerPc = Number(field === 'marketRate' ? value : updated.marketRate) || 0;
            updated.totalAmount = Number((pricePerPc * qty).toFixed(2));
          }
        }

        // Allow manual override of totalAmount if needed? 
        // Usually if it's calculated, we might disable manual edit or update it if user types.
        if (field === 'totalAmount') {
          updated.totalAmount = Number(value) || 0;
        }

        return updated;
      });

      return {
        ...prev,
        products,
      };
    });
  };

  const handleAddProduct = () => {
    updateFormData((prev) => ({
      ...prev,
      products: [...prev.products, createEmptyProduct()],
    }));
  };

  const handleRemoveProduct = (index: number) => {
    updateFormData((prev) => {
      if (prev.products.length === 1) return prev;
      return {
        ...prev,
        products: prev.products.filter((_, idx) => idx !== index),
      };
    });
  };

  const validateForm = () => {
    if (!formData.customerName.trim()) {
      setError('Customer name is required.');
      setActiveTab('order');
      return false;
    }

    if (!formData.orderDate) {
      setError('Order date is required.');
      setActiveTab('order');
      return false;
    }

    if (!formData.expectedDeliveryDate) {
      setError('Expected delivery date is required.');
      setActiveTab('order');
      return false;
    }

    if (!formData.products.length) {
      setError('Add at least one product.');
      setActiveTab('lineItems');
      return false;
    }

    const invalidProduct = formData.products.find((product) => {
      if (!product.itemId) return true;
      const unit = product.quantityUnit || 'kg';
      if (unit === 'pc') {
        return Number(product.quantityPc) <= 0 || Number(product.marketRate) <= 0;
      }
      return Number(product.quantityKg) <= 0 || Number(product.marketRate) <= 0;
    });

    if (invalidProduct) {
      const unit = invalidProduct.quantityUnit || 'kg';
      const msg = unit === 'pc'
        ? 'Each product requires a selected item, quantity (Pc), and price per pc.'
        : 'Each product requires a selected item, quantity (Kg), and market rate.';
      setError(msg);
      setActiveTab('lineItems');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      await onSubmit(formData);
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || 'Failed to save order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '';
    return `₹ ${Number(value).toLocaleString('en-IN')}`;
  };

  const formattedProductsTotal = useMemo(() => formatCurrency(formData.productsTotal), [formData.productsTotal]);

  return (
    <div className="order-modal-overlay" onClick={onClose}>
      <div className="order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal-header">
          <div>
            <p className="order-modal-subtitle">{isEditMode ? 'Update existing order' : 'Create a new order'}</p>
            <h2 className="order-modal-title">{isEditMode ? 'Update Order' : 'Create a new order'}</h2>
          </div>
          <button type="button" className="order-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="order-modal-tabs">
          <button
            type="button"
            className={`order-modal-tab ${activeTab === 'order' ? 'active' : ''}`}
            onClick={() => setActiveTab('order')}
          >
            Order Details
          </button>
          <button
            type="button"
            className={`order-modal-tab ${activeTab === 'lineItems' ? 'active' : ''}`}
            onClick={() => setActiveTab('lineItems')}
          >
            Line Items
          </button>
        </div>

        <form className="order-modal-body" onSubmit={handleSubmit}>
          {activeTab === 'order' && (
            <div className="order-details-grid">
              <div className="order-form-group">
                <label>Customer Name*</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleFieldChange('customerName', e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Order Date*</label>
                <input
                  type="date"
                  value={formData.orderDate}
                  max={formData.expectedDeliveryDate || undefined}
                  onChange={(e) => handleFieldChange('orderDate', e.target.value)}
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Contact Number*</label>
                <input
                  type="tel"
                  value={formData.customerMobileNo || ''}
                  onChange={(e) => handleFieldChange('customerMobileNo', e.target.value)}
                  placeholder="+91 95467 90777"
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Email ID*</label>
                <input
                  type="email"
                  value={formData.customerEmail || ''}
                  onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                  placeholder="acmecorp@email.com"
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Expected Delivery Date*</label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => handleFieldChange('expectedDeliveryDate', e.target.value)}
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Total Items</label>
                <input type="number" value={formData.totalItems || 0} readOnly />
              </div>
              <div className="order-form-group">
                <label>Order Floor*</label>
                <select
                  value={formData.orderFloor}
                  onChange={(e) => handleFieldChange('orderFloor', e.target.value as OrderFloor)}
                  required
                  disabled={!!fixedFloor}
                >
                  <option value={OrderFloor.GROUND_FLOOR}>Ground Floor</option>
                  <option value={OrderFloor.FIRST_FLOOR}>First Floor</option>
                </select>
              </div>
              <div className="order-form-group">
                <label>Payment Date*</label>
                <input
                  type="date"
                  value={formData.paymentDate || ''}
                  onChange={(e) => handleFieldChange('paymentDate', e.target.value)}
                  required
                />
              </div>
              <div className="order-form-group">
                <label>Products Total</label>
                <input type="text" value={formattedProductsTotal} readOnly />
              </div>
            </div>
          )}

          {activeTab === 'lineItems' && (
            <div className="line-items-section">
              <div className="line-items-header">
                <h3>Add Products</h3>
                <button type="button" className="add-item-btn" onClick={handleAddProduct}>
                  + Add Item
                </button>
              </div>

              {formData.products.map((product, index) => {
                const unit = product.quantityUnit || 'kg';
                const isPc = unit === 'pc';
                return (
                  <div className="line-item-card" key={`product-${index}`}>
                    <div className="line-item-card-header">
                      <div className="line-item-pill">Item {String(index + 1).padStart(2, '0')}</div>
                      <button
                        type="button"
                        className="order-btn"
                        data-variant="danger"
                        data-shape="icon"
                        onClick={() => handleRemoveProduct(index)}
                        disabled={formData.products.length === 1}
                        aria-label="Remove product"
                      >
                        <img src={DeleteIcon} alt="Remove" />
                      </button>
                    </div>
                    <div className="line-item-grid">
                      <div className="line-item-field line-item-field--product">
                        <label>Product*</label>
                        <select
                          value={product.itemId || ''}
                          onChange={(e) => {
                            const selectedItemId = Number(e.target.value);
                            const selectedItem = stockItems.find((item) => item.stockItemId === selectedItemId);
                            handleProductChange(index, 'itemId', selectedItemId);
                            if (selectedItem) {
                              handleProductChange(index, 'productName', selectedItem.product.productName);
                            }
                          }}
                          required
                          disabled={stockItemsLoading}
                          title="Select a product"
                        >
                          <option value="">Select Product</option>
                          {stockItems.map((item) => (
                            <option key={item.stockItemId} value={item.stockItemId}>
                              {item.product.productName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="line-item-field">
                        <label>Unit*</label>
                        <div className="unit-toggle">
                          <button
                            type="button"
                            className={`unit-toggle-btn ${!isPc ? 'active' : ''}`}
                            onClick={() => handleProductChange(index, 'quantityUnit', 'kg')}
                          >
                            Kg
                          </button>
                          <button
                            type="button"
                            className={`unit-toggle-btn ${isPc ? 'active' : ''}`}
                            onClick={() => handleProductChange(index, 'quantityUnit', 'pc')}
                          >
                            Pc
                          </button>
                        </div>
                      </div>
                      {isPc ? (
                        <>
                          <div className="line-item-field">
                            <label>Qty (Pc)*</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={product.quantityPc || ''}
                              onChange={(e) => handleProductChange(index, 'quantityPc', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="line-item-field">
                            <label>Price/Pc*</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.marketRate || ''}
                              onChange={(e) => handleProductChange(index, 'marketRate', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="line-item-field">
                            <label>Total ₹</label>
                            <input
                              type="number"
                              value={product.totalAmount || ''}
                              readOnly
                              placeholder="0"
                              className="bg-gray-100 cursor-not-allowed"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="line-item-field">
                            <label>Qty (Kg)*</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.quantityKg || ''}
                              onChange={(e) => handleProductChange(index, 'quantityKg', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="line-item-field">
                            <label>Market Rate*</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.marketRate || ''}
                              onChange={(e) => handleProductChange(index, 'marketRate', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="line-item-field">
                            <label>Rate Diff*</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.rateDifference || ''}
                              onChange={(e) => handleProductChange(index, 'rateDifference', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                          <div className="line-item-field">
                            <label>Total ₹*</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.totalAmount || ''}
                              onChange={(e) => handleProductChange(index, 'totalAmount', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="line-item-total">
                <label>Items Total*</label>
                <input type="text" value={formatCurrency(formData.productsTotal)} readOnly />
              </div>

              <div className="amount-summary">
                <h3>Amount Total</h3>
                <div className="amount-grid">
                  <div className="order-form-group">
                    <label>Offline Bill %*</label>
                    <select
                      value={formData.offlineBillPercent || ''}
                      onChange={(e) => handleFieldChange('offlineBillPercent', Number(e.target.value) || 0)}
                    >
                      <option value="">Select %</option>
                      {[0, 10, 15, 20, 25, 30, 40, 50].map((percent) => (
                        <option value={percent} key={percent}>
                          {percent}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="order-form-group">
                    <label>Items Total*</label>
                    <input type="text" value={formatCurrency(formData.productsTotal)} readOnly />
                  </div>
                  <div className="order-form-group">
                    <label>Offline Total*</label>
                    <input type="text" value={formatCurrency(formData.offlineTotal)} readOnly />
                  </div>
                  <div className="order-form-group">
                    <label>Official Bill Amount*</label>
                    <input type="text" value={formatCurrency(formData.officialBillAmount)} readOnly />
                  </div>
                  <div className="order-form-group">
                    <label>GST*</label>
                    <input type="text" value={formatCurrency(formData.gst)} readOnly />
                  </div>
                  <div className="order-form-group">
                    <label>Grand Total*</label>
                    <input type="text" value={formatCurrency(formData.grandTotal)} readOnly />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="order-modal-error">{error}</div>}

          <div className="order-modal-actions">
            {activeTab === 'order' && (
              <button
                type="button"
                className="order-btn"
                data-variant="primary"
                onClick={() => setActiveTab('lineItems')}
              >
                Save &amp; Continue
              </button>
            )}
            {activeTab === 'lineItems' && (
              <>
                <button type="submit" className="order-btn" data-variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving…' : isEditMode ? 'Update Order' : 'Save Order'}
                </button>
                <button type="button" className="order-btn" data-variant="secondary" onClick={onClose}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderModal;
