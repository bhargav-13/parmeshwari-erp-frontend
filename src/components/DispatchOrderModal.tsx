import React, { useEffect, useState } from 'react';
import type { Order, StockItem, DispatchRequest, DispatchItem } from '../types';
import { stockItemApi } from '../api/inventory';
import { ordersApi } from '../api/orders';
import './DispatchOrderModal.css';

interface DispatchOrderModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

interface DispatchItemState {
  itemId: number;
  productName: string;
  orderQuantity: number;
  selectedQuantities: { [stockItemId: number]: number };
  selectedItems: { [stockItemId: number]: boolean };
  isDropdownOpen: boolean;
}

const DispatchOrderModal: React.FC<DispatchOrderModalProps> = ({ order, onClose, onSuccess }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockItemsLoading, setStockItemsLoading] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItemState[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (order.products && order.products.length > 0 && stockItems.length > 0) {
      const initialItems: DispatchItemState[] = order.products.map((product) => {
        const initialSelectedQuantities: { [key: number]: number } = {};
        const initialSelectedItems: { [key: number]: boolean } = {};

        stockItems.forEach((item) => {
          initialSelectedQuantities[item.stockItemId] = product.quantityKg || 0;
          initialSelectedItems[item.stockItemId] = false;
        });

        return {
          itemId: product.itemId,
          productName: product.productName,
          orderQuantity: product.quantityKg || 0,
          selectedQuantities: initialSelectedQuantities,
          selectedItems: initialSelectedItems,
          isDropdownOpen: true,
        };
      });
      setDispatchItems(initialItems);
    }
  }, [order.products, stockItems]);

  const handleQuantityChange = (itemIndex: number, stockItemId: number, delta: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        const currentQty = item.selectedQuantities[stockItemId] || 0;
        const newQty = Math.max(0, currentQty + delta);
        return {
          ...item,
          selectedQuantities: {
            ...item.selectedQuantities,
            [stockItemId]: newQty,
          },
        };
      })
    );
  };

  const handleCheckboxChange = (itemIndex: number, stockItemId: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return {
          ...item,
          selectedItems: {
            ...item.selectedItems,
            [stockItemId]: !item.selectedItems[stockItemId],
          },
        };
      })
    );
  };

  const toggleDropdown = (itemIndex: number) => {
    setDispatchItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item;
        return {
          ...item,
          isDropdownOpen: !item.isDropdownOpen,
        };
      })
    );
  };

  const handleSubmit = async () => {
    const dispatchRequestItems: DispatchItem[] = [];

    dispatchItems.forEach((item) => {
      Object.entries(item.selectedItems).forEach(([stockItemIdStr, isSelected]) => {
        if (isSelected) {
          const stockItemId = Number(stockItemIdStr);
          const quantity = item.selectedQuantities[stockItemId] || 0;
          if (quantity > 0) {
            dispatchRequestItems.push({
              itemId: stockItemId,
              quantity,
            });
          }
        }
      });
    });

    if (dispatchRequestItems.length === 0) {
      setError('Please select at least one item to dispatch.');
      return;
    }

    const payload: DispatchRequest = {
      items: dispatchRequestItems,
    };

    try {
      setIsSaving(true);
      setError(null);
      await ordersApi.dispatchOrder(order.id, payload);
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to dispatch order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="dispatch-modal-overlay" onClick={onClose}>
      <div className="dispatch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dispatch-modal-header">
          <h2 className="dispatch-modal-title">Dispatch Order</h2>
          <button type="button" className="dispatch-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="dispatch-modal-body">
          {stockItemsLoading ? (
            <div className="dispatch-loading">Loading stock items...</div>
          ) : (
            <>
              {dispatchItems.map((item, index) => (
                <div className="dispatch-item-row" key={`dispatch-item-${index}`}>
                  <div className="dispatch-item-field">
                    <label>Item {index + 1}</label>
                    <div className="dispatch-item-input-box">
                      <span>{item.productName}</span>
                    </div>
                  </div>
                  <div className="dispatch-item-field">
                    <label>Used Items</label>
                    <div className="dispatch-items-list">
                      <div
                        className={`dispatch-items-header ${!item.isDropdownOpen ? 'collapsed' : ''}`}
                        onClick={() => toggleDropdown(index)}
                      >
                        <span>Select</span>
                        <span className={`dropdown-icon ${!item.isDropdownOpen ? 'collapsed' : ''}`}>&#9662;</span>
                      </div>
                      {item.isDropdownOpen && stockItems.map((stockItem, stockIndex) => (
                        <div
                          className={`dispatch-items-row ${stockIndex === 0 ? 'first-row' : ''} ${stockIndex === stockItems.length - 1 ? 'last-row' : ''}`}
                          key={stockItem.stockItemId}
                        >
                          <span className="item-name">{stockItem.product.productName}</span>
                          <div className="item-controls">
                            <button
                              type="button"
                              className="qty-control-btn"
                              onClick={() => handleQuantityChange(index, stockItem.stockItemId, -1)}
                            >
                              &minus;
                            </button>
                            <span className="qty-display">
                              {item.selectedQuantities[stockItem.stockItemId] || 0}
                            </span>
                            <button
                              type="button"
                              className="qty-control-btn"
                              onClick={() => handleQuantityChange(index, stockItem.stockItemId, 1)}
                            >
                              +
                            </button>
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={item.selectedItems[stockItem.stockItemId] || false}
                                onChange={() => handleCheckboxChange(index, stockItem.stockItemId)}
                                title="Select item for dispatch"
                              />
                              <span className="checkmark"></span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {error && <div className="dispatch-modal-error">{error}</div>}
        </div>

        <div className="dispatch-modal-actions">
          <button
            type="button"
            className="dispatch-save-btn"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchOrderModal;
