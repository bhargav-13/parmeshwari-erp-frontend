import React, { useState } from 'react';
import { stockItemApi } from '../api/inventory';
import type { PurchaseResponse, StockItemRequest } from '../types';
import { PurchaseInventoryType, QuantityUnit, InventoryFloor } from '../types';
import './InventoryUpdateModal.css';

interface InventoryUpdateModalProps {
  onClose: () => void;
  onSuccess: () => void;
  purchaseResponse: PurchaseResponse;
}

const InventoryUpdateModal: React.FC<InventoryUpdateModalProps> = ({
  onClose,
  onSuccess,
  purchaseResponse,
}) => {
  const isRaw = purchaseResponse.inventoryType === PurchaseInventoryType.RAW_MATERIAL;
  // The server has already added this purchase to the stock, so the figure it sends back
  // is the new total. This popup only settles the price per kg.
  const totalQty = isRaw
    ? (purchaseResponse.rawInventory?.quantityInKg || 0)
    : (purchaseResponse.stockInventory?.quantityInKg || 0);
  const existingQty = Math.max(0, totalQty - purchaseResponse.qty);

  const calculateWeightedAvgPrice = () => {
    if (isRaw) return 0;
    const existingPrice = purchaseResponse.stockInventory?.pricePerKg || 0;
    const newRate = purchaseResponse.rate || 0;
    if (totalQty === 0) return newRate;
    return (existingQty * existingPrice + purchaseResponse.qty * newRate) / totalQty;
  };

  const [pricePerKg, setPricePerKg] = useState<number>(!isRaw ? calculateWeightedAvgPrice() : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInventoryTypeLabel = (type: PurchaseInventoryType) => {
    switch (type) {
      case PurchaseInventoryType.RAW_MATERIAL: return 'Raw Material';
      case PurchaseInventoryType.GROUND_FLOOR: return 'Ground Floor';
      case PurchaseInventoryType.FIRST_FLOOR: return 'First Floor';
      default: return type;
    }
  };

  const getAutoCalculatedPc = () => {
    return purchaseResponse.stockInventory?.quantityInPc || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      if (!isRaw && purchaseResponse.stockInventory) {
        // Only the price changes here. The quantity is read fresh so a dispatch made in
        // the meantime is not undone.
        const stock = await stockItemApi.getStockItemById(purchaseResponse.stockInventory.stockItemId);
        const updateData: StockItemRequest = {
          productId: stock.product.productId,
          categoryId: stock.category.categoryId,
          quantityInKg: stock.quantityInKg,
          quantityInPc: stock.quantityInPc,
          weightPerPc: stock.weightPerPc,
          pricePerKg: pricePerKg,
          quantityUnit: stock.quantityUnit || QuantityUnit.KG,
          inventoryFloor: stock.inventoryFloor || InventoryFloor.GROUND_FLOOR,
          lowStockAlert: stock.lowStockAlert,
        };
        await stockItemApi.updateStockItem(stock.stockItemId, updateData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.body?.message || err.message || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseResponse.rawInventory && !purchaseResponse.stockInventory) {
    return null;
  }

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Stock Added — Confirm Price</h2>

        <div className="inventory-update-warning">
          This product was already in inventory, so the purchased quantity has been added to its stock. Check the price per kg below and save it, or close this to keep the current price.
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Row 1: Product + Inventory Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-product">Product Name</label>
              <input
                id="inv-product"
                type="text"
                value={purchaseResponse.product?.productName || 'N/A'}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-type">Inventory Type</label>
              <input
                id="inv-type"
                type="text"
                value={getInventoryTypeLabel(purchaseResponse.inventoryType)}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 2: Challan No + Rate */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-challan">Challan No.</label>
              <input
                id="inv-challan"
                type="text"
                value={purchaseResponse.chNo}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-rate">Purchase Rate (per Kg)</label>
              <input
                id="inv-rate"
                type="number"
                value={purchaseResponse.rate}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 3: Existing Qty + Purchase Qty */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-existing-qty">Stock Before (Kg)</label>
              <input
                id="inv-existing-qty"
                type="number"
                value={existingQty}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-new-qty">New Purchase Qty (Kg)</label>
              <input
                id="inv-new-qty"
                type="number"
                value={purchaseResponse.qty}
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Row 4: Total Qty (auto sum) + Low Stock */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="inv-total-qty">Stock Now (Kg)</label>
              <input
                id="inv-total-qty"
                type="number"
                value={totalQty}
                className="form-input"
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inv-low-stock">Low Stock Alert</label>
              <input
                id="inv-low-stock"
                type="number"
                value={isRaw
                  ? purchaseResponse.rawInventory?.lowStockAlert || 0
                  : purchaseResponse.stockInventory?.lowStockAlert || 0
                }
                className="form-input"
                disabled
              />
            </div>
          </div>

          {/* Stock-specific frozen fields */}
          {!isRaw && purchaseResponse.stockInventory && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-category">Category</label>
                  <input
                    id="inv-category"
                    type="text"
                    value={purchaseResponse.stockInventory.category?.categoryName || 'N/A'}
                    className="form-input"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-weight-pc">Weight per Pc</label>
                  <input
                    id="inv-weight-pc"
                    type="number"
                    value={purchaseResponse.stockInventory.weightPerPc || 0}
                    className="form-input"
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="inv-qty-pc">Stock Now (Pcs)</label>
                  <input
                    id="inv-qty-pc"
                    type="number"
                    value={getAutoCalculatedPc()}
                    className="form-input"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-highlight" htmlFor="inv-price-kg">Price per Kg* (Weighted Avg)</label>
                  <input
                    id="inv-price-kg"
                    type="number"
                    value={parseFloat(pricePerKg.toFixed(2))}
                    onChange={(e) => setPricePerKg(parseFloat(e.target.value) || 0)}
                    placeholder="Enter Price per Kg"
                    className="form-input"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                  />
                  <small className="price-hint">
                    ({existingQty} kg × ₹{purchaseResponse.stockInventory?.pricePerKg || 0} + {purchaseResponse.qty} kg × ₹{purchaseResponse.rate || 0}) / {totalQty} kg
                  </small>
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Price'}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Keep Current Price
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryUpdateModal;
