import React, { useState } from 'react';
import { purchaseApi } from '../api/purchase';
import { productApi, categoryApi } from '../api/inventory';
import type { Product, Category, PurchaseRequest, PurchaseResponse, ProductRequest, CategoryRequest, PurchaseParty } from '../types';
import { PurchaseInventoryType, QuantityUnit } from '../types';
import './AddStockItemModal.css';
import { canPickFloor } from '../lib/auth';
import DateInput from './DateInput';
import { todayLocal, toIsoDate } from '../utils/format';

interface AddPurchaseModalProps {
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  purchaseParties?: PurchaseParty[];
  categories: Category[];
  /** Called with every saved item whose product was already in inventory */
  onAlreadyExists: (responses: PurchaseResponse[]) => void;
  editingPurchase?: PurchaseResponse | null;
}

/** One item of the challan; each is saved as its own purchase */
interface PurchaseItem {
  key: number;
  productId: number;
  inventoryType: PurchaseInventoryType;
  qty: number;
  rate: number;
  lowStockAlert: number;
  categoryId?: number;
  weightPerPc?: number;
  quantityUnit?: QuantityUnit;
  quantityInPc?: number;
}

interface ChallanFields {
  purchaseDate: string;
  chNo: string;
  partyId: number;
  amountDeposited: number;
}

let nextKey = 1;

const newItem = (inventoryType: PurchaseInventoryType = PurchaseInventoryType.RAW_MATERIAL): PurchaseItem => ({
  key: nextKey++,
  productId: 0,
  inventoryType,
  qty: 0,
  rate: 0,
  lowStockAlert: 0,
});

// Floor of the chosen inventory type; raw material isn't floor-wise, so it lists every product
const floorOfType = (type: string): string | null =>
  type === PurchaseInventoryType.GROUND_FLOOR ? 'GROUND_FLOOR'
    : type === PurchaseInventoryType.FIRST_FLOOR ? 'FIRST_FLOOR'
      : null;

const isStockType = (type: string) =>
  type === PurchaseInventoryType.GROUND_FLOOR || type === PurchaseInventoryType.FIRST_FLOOR;

const calculateQuantityInPc = (quantityInKg: number, weightPerPc: number, unit: QuantityUnit): number => {
  if (unit === QuantityUnit.PCS) return quantityInKg; // qty is already in pieces
  if (weightPerPc === 0) return 0;
  const weightPerPcInKg = unit === QuantityUnit.GM ? weightPerPc / 1000 : weightPerPc;
  return Math.floor(quantityInKg / weightPerPcInKg);
};

const formatMoney = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  onClose,
  onSuccess,
  products,
  purchaseParties = [],
  categories,
  onAlreadyExists,
  editingPurchase,
}) => {
  const isEditMode = !!editingPurchase;

  const [challan, setChallan] = useState<ChallanFields>(() =>
    editingPurchase
      ? {
          purchaseDate: toIsoDate(editingPurchase.purchaseDate) || todayLocal(),
          chNo: editingPurchase.chNo,
          partyId: editingPurchase.partyId,
          amountDeposited: editingPurchase.amountDeposited,
        }
      : { purchaseDate: todayLocal(), chNo: '', partyId: 0, amountDeposited: 0 }
  );

  const [items, setItems] = useState<PurchaseItem[]>(() =>
    editingPurchase
      ? [{
          key: nextKey++,
          productId: editingPurchase.product?.productId ?? 0,
          inventoryType: editingPurchase.inventoryType,
          qty: editingPurchase.qty,
          rate: editingPurchase.rate,
          lowStockAlert: editingPurchase.stockInventory?.lowStockAlert ?? editingPurchase.rawInventory?.lowStockAlert ?? 0,
          categoryId: editingPurchase.stockInventory?.category?.categoryId,
          quantityInPc: editingPurchase.stockInventory?.quantityInPc,
          weightPerPc: editingPurchase.stockInventory?.weightPerPc,
          quantityUnit: (editingPurchase.stockInventory?.quantityUnit as QuantityUnit | undefined) ?? undefined,
        }]
      : [newItem()]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  // Which item row is adding a new product / category inline
  const [addingProductFor, setAddingProductFor] = useState<number | null>(null);
  const [addingCategoryFor, setAddingCategoryFor] = useState<number | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleChallanChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numeric = name === 'partyId' || name === 'amountDeposited';
    setChallan((prev) => ({ ...prev, [name]: numeric ? parseFloat(value) || 0 : value }));
  };

  const updateItem = (key: number, name: keyof PurchaseItem, rawValue: string) => {
    if (name === 'productId' && rawValue === 'add_new') {
      setAddingProductFor(key);
      setNewProductName('');
      return;
    }
    if (name === 'categoryId' && rawValue === 'add_new') {
      setAddingCategoryFor(key);
      setNewCategoryName('');
      return;
    }
    const numericFields: (keyof PurchaseItem)[] = ['productId', 'qty', 'rate', 'lowStockAlert', 'categoryId', 'weightPerPc'];
    const value = numericFields.includes(name) ? parseFloat(rawValue) || 0 : rawValue;

    setItems((prev) => prev.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, [name]: value } as PurchaseItem;

      // Switching to a floor: a product from the other floor no longer fits
      if (name === 'inventoryType' && item.productId) {
        const floor = floorOfType(value as string);
        const product = localProducts.find((p) => p.productId === item.productId);
        if (floor && product && (product.floor ?? 'FIRST_FLOOR') !== floor) next.productId = 0;
      }

      if (isStockType(next.inventoryType) && (name === 'qty' || name === 'weightPerPc' || name === 'quantityUnit' || name === 'inventoryType')) {
        next.quantityInPc = calculateQuantityInPc(next.qty, next.weightPerPc || 0, next.quantityUnit || QuantityUnit.KG);
      }
      return next;
    }));
  };

  const addItem = () => {
    // A new row starts on the last row's inventory type, which is usually the same
    setItems((prev) => [...prev, newItem(prev[prev.length - 1]?.inventoryType)]);
  };

  const removeItem = (key: number) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  };

  const handleAddProduct = async (item: PurchaseItem) => {
    if (!newProductName.trim()) {
      setError('Product name is required');
      return;
    }
    try {
      setLoading(true);
      const data: ProductRequest = {
        productName: newProductName.trim(),
        ...(item.inventoryType === PurchaseInventoryType.GROUND_FLOOR ? { floor: 'GROUND_FLOOR' as const } : {}),
        ...(item.inventoryType === PurchaseInventoryType.FIRST_FLOOR ? { floor: 'FIRST_FLOOR' as const } : {}),
      };
      const created = await productApi.createProduct(data);
      setLocalProducts((prev) => [...prev, created]);
      setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, productId: created.productId } : i)));
      setAddingProductFor(null);
      setNewProductName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (item: PurchaseItem) => {
    if (!newCategoryName.trim()) {
      setError('Category name is required');
      return;
    }
    try {
      setLoading(true);
      const data: CategoryRequest = { categoryName: newCategoryName.trim() };
      const created = await categoryApi.createCategory(data);
      setLocalCategories((prev) => [...prev, created]);
      setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, categoryId: created.categoryId } : i)));
      setAddingCategoryFor(null);
      setNewCategoryName('');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const productName = (id: number) => localProducts.find((p) => p.productId === id)?.productName || `Item`;

  const validate = (): string | null => {
    if (!challan.chNo.trim()) return 'Challan number is required';
    if (!challan.partyId) return 'Please select a party';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const label = items.length > 1 ? `Item ${i + 1}: ` : '';
      if (!item.productId) return `${label}Please select a product`;
      if (item.qty <= 0) return `${label}Quantity must be greater than 0`;
      if (item.rate <= 0) return `${label}Rate must be greater than 0`;
      if (isStockType(item.inventoryType) && !item.categoryId) return `${label}Category is required for stock inventory`;
    }
    return null;
  };

  const toPayload = (item: PurchaseItem, index: number): PurchaseRequest => {
    const payload: PurchaseRequest = {
      chNo: challan.chNo.trim(),
      purchaseDate: challan.purchaseDate,
      partyId: challan.partyId,
      productId: item.productId,
      qty: item.qty,
      rate: item.rate,
      // The amount paid is for the whole challan; it is kept on the first item only
      amountDeposited: index === 0 ? challan.amountDeposited : 0,
      inventoryType: item.inventoryType,
      lowStockAlert: item.lowStockAlert,
    };
    if (isStockType(item.inventoryType)) {
      payload.categoryId = item.categoryId;
      payload.quantityInPc = item.quantityInPc;
      payload.weightPerPc = item.weightPerPc;
      payload.quantityUnit = item.quantityUnit || QuantityUnit.KG;
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setLoading(true);
    if (isEditMode) {
      try {
        await purchaseApi.updatePurchase(editingPurchase!.purchaseId, toPayload(items[0], 0));
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.message || err.body?.message || err.message || 'Failed to update purchase');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Saved one by one; a failed item stays in the form so it can be fixed and saved again
    const alreadyExists: PurchaseResponse[] = [];
    const failed: PurchaseItem[] = [];
    let firstError: string | null = null;
    let savedCount = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const response = await purchaseApi.createPurchase(toPayload(item, savedCount === 0 ? 0 : i));
        savedCount++;
        if (response.inventoryStatus === 'ALREADY_EXISTS') alreadyExists.push(response);
      } catch (err: any) {
        failed.push(item);
        firstError = firstError
          || `${productName(item.productId)}: ${err.response?.data?.message || err.body?.message || err.message || 'Failed to save'}`;
      }
    }
    setLoading(false);

    if (failed.length === 0) {
      onSuccess();
      onClose();
      if (alreadyExists.length > 0) onAlreadyExists(alreadyExists);
      return;
    }

    if (savedCount > 0) {
      onSuccess();
      // The deposit went on a saved item; don't save it twice
      setChallan((prev) => ({ ...prev, amountDeposited: 0 }));
      if (alreadyExists.length > 0) onAlreadyExists(alreadyExists);
    }
    setItems(failed);
    setError(
      savedCount > 0
        ? `${savedCount} item${savedCount === 1 ? '' : 's'} saved. Not saved — ${firstError}`
        : firstError
    );
  };

  const challanTotal = items.reduce((sum, i) => sum + (i.qty || 0) * (i.rate || 0), 0);

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content add-stock-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditMode ? 'Edit Purchase' : 'Add Purchase'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Challan: date, number, party */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="purchase-date">Purchase Date*</label>
              <DateInput
                id="purchase-date"
                name="purchaseDate"
                value={challan.purchaseDate}
                onChange={handleChallanChange}
                className="form-input"
                max={todayLocal()}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Challan No.*</label>
              <input
                type="text"
                name="chNo"
                value={challan.chNo}
                onChange={handleChallanChange}
                placeholder="Enter challan number"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Party*</label>
              <select
                name="partyId"
                value={challan.partyId}
                onChange={handleChallanChange}
                className="form-select"
                required
                aria-label="Party"
              >
                <option value={0}>Select</option>
                {purchaseParties.map((party) => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount Deposited</label>
              <input
                type="number"
                name="amountDeposited"
                value={challan.amountDeposited}
                onChange={handleChallanChange}
                placeholder="Enter amount deposited"
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Items: each one is saved as its own purchase */}
          <div className="purchase-items">
            {items.map((item, index) => {
              const stock = isStockType(item.inventoryType);
              const floor = floorOfType(item.inventoryType);
              return (
                <div key={item.key} className="purchase-item-card">
                  <div className="purchase-item-head">
                    <span className="purchase-item-title">
                      {isEditMode ? 'Item' : `Item ${index + 1}`}
                    </span>
                    {item.qty > 0 && item.rate > 0 && (
                      <span className="purchase-item-amount">₹ {formatMoney(item.qty * item.rate)}</span>
                    )}
                    {!isEditMode && items.length > 1 && (
                      <button type="button" className="purchase-item-remove" onClick={() => removeItem(item.key)} title="Remove item">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Product Name*</label>
                      {addingProductFor === item.key ? (
                        <div className="inline-add-container">
                          <input
                            type="text"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            placeholder="Enter new product name"
                            className="form-input"
                            autoFocus
                          />
                          <button type="button" onClick={() => handleAddProduct(item)} className="save-button inline-add-button" disabled={loading}>
                            Add
                          </button>
                          <button type="button" onClick={() => { setAddingProductFor(null); setNewProductName(''); }} className="cancel-button inline-add-button">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(item.key, 'productId', e.target.value)}
                          className="form-select"
                          required
                          aria-label={`Product for item ${index + 1}`}
                        >
                          <option value={0}>Select</option>
                          {localProducts
                            .filter((product) =>
                              floor === null ||
                              (product.floor ?? 'FIRST_FLOOR') === floor ||
                              // keep an existing purchase's product visible even if it's on the other floor
                              (isEditMode && product.productId === item.productId))
                            .map((product) => (
                              <option key={product.productId} value={product.productId}>{product.productName}</option>
                            ))}
                          <option value="add_new" className="add-new-option">+ Add New Product</option>
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Inventory Type*</label>
                      <select
                        value={item.inventoryType}
                        onChange={(e) => updateItem(item.key, 'inventoryType', e.target.value)}
                        className="form-select"
                        required
                        aria-label={`Inventory type for item ${index + 1}`}
                      >
                        <option value={PurchaseInventoryType.RAW_MATERIAL}>Raw Material</option>
                        {canPickFloor('GROUND_FLOOR') && <option value={PurchaseInventoryType.GROUND_FLOOR}>Ground Floor</option>}
                        {canPickFloor('FIRST_FLOOR') && <option value={PurchaseInventoryType.FIRST_FLOOR}>First Floor</option>}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Quantity in Kg.*</label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.key, 'qty', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="eg : 2,000 kg"
                        className="form-input"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rate (per Kg)*</label>
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.key, 'rate', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Enter rate per Kg"
                        className="form-input"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Low Stock Warning</label>
                      <input
                        type="number"
                        value={item.lowStockAlert}
                        onChange={(e) => updateItem(item.key, 'lowStockAlert', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Select Low Stock (Kg)"
                        className="form-input"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    {stock ? (
                      <div className="form-group">
                        <label className="form-label">Category*</label>
                        {addingCategoryFor === item.key ? (
                          <div className="inline-add-container">
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Enter new category name"
                              className="form-input"
                              autoFocus
                            />
                            <button type="button" onClick={() => handleAddCategory(item)} className="save-button inline-add-button" disabled={loading}>
                              Add
                            </button>
                            <button type="button" onClick={() => { setAddingCategoryFor(null); setNewCategoryName(''); }} className="cancel-button inline-add-button">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <select
                            value={item.categoryId || 0}
                            onChange={(e) => updateItem(item.key, 'categoryId', e.target.value)}
                            className="form-select"
                            required
                            aria-label={`Category for item ${index + 1}`}
                          >
                            <option value={0}>Select</option>
                            {localCategories.map((cat) => (
                              <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                            ))}
                            <option value="add_new" className="add-new-option">+ Add New Category</option>
                          </select>
                        )}
                      </div>
                    ) : (
                      <div className="form-group" />
                    )}
                  </div>

                  {stock && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Quantity Weight per pc. (Kg/Gm)</label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            value={item.weightPerPc || 0}
                            onChange={(e) => updateItem(item.key, 'weightPerPc', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Enter Pc. Weight"
                            className="form-input"
                            step="0.001"
                            min="0"
                          />
                          <select
                            value={item.quantityUnit || QuantityUnit.KG}
                            onChange={(e) => updateItem(item.key, 'quantityUnit', e.target.value)}
                            className="unit-select"
                            aria-label={`Quantity unit for item ${index + 1}`}
                          >
                            <option value={QuantityUnit.KG}>Kg</option>
                            <option value={QuantityUnit.GM}>Gm</option>
                            <option value={QuantityUnit.PCS}>Pcs</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity in Pc. (Auto-calculated)</label>
                        <input
                          type="number"
                          value={item.quantityInPc || 0}
                          placeholder="Auto-calculated"
                          className="form-input"
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!isEditMode && (
              <div className="purchase-items-footer">
                <button type="button" className="purchase-add-item" onClick={addItem}>
                  + Add Item
                </button>
                {items.length > 1 && (
                  <span className="purchase-items-total">
                    {items.length} items · ₹ {formatMoney(challanTotal)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update' : items.length > 1 ? `Save ${items.length} Items` : 'Save'}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPurchaseModal;
