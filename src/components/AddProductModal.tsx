import React, { useState } from 'react';
import { productApi } from '../api/inventory';
import type { ProductRequest } from '../types';
import './AddProductModal.css';

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSuccess }) => {
  const [productName, setProductName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }

    try {
      setLoading(true);
      const data: ProductRequest = { productName: productName.trim() };
      await productApi.createProduct(data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add New Product Name</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Product Name*</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter New Product"
              className="form-input"
              required
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
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

export default AddProductModal;
