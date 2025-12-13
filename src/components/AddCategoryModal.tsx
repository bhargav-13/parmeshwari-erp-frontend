import React, { useState } from 'react';
import { categoryApi } from '../api/inventory';
import type { CategoryRequest } from '../types';
import './AddProductModal.css';

interface AddCategoryModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ onClose, onSuccess }) => {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const data: CategoryRequest = { categoryName: categoryName.trim() };
      await categoryApi.createCategory(data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add New Category</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Category Name*</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter New Category"
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

export default AddCategoryModal;