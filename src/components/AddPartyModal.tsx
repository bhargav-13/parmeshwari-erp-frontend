import React, { useState, useEffect } from 'react';
import type { Party } from '../types';
import './AddProductModal.css'; // Reuse existing styles

interface AddPartyModalProps {
  onClose: () => void;
  onSuccess: (party: Party) => void;
  initialData?: Party;
}

const AddPartyModal: React.FC<AddPartyModalProps> = ({ onClose, onSuccess, initialData }) => {
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setOpeningBalance(initialData.openingBalance);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    e.stopPropagation(); // Stop event propagation

    setError(null);

    if (!name.trim()) {
      setError('Party name is required');
      return;
    }

    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const newParty: Party = {
        partyId: initialData ? initialData.partyId : Math.floor(Math.random() * 1000) + 200, // Mock ID
        name: name.trim(),
        openingBalance: Number(openingBalance) || 0,
      };

      onSuccess(newParty);
      onClose();
    } catch (err: any) {
      console.error("Error saving party:", err);
      setError('Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initialData ? 'Edit Party' : 'Add New Party'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Party Name*</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Party Name"
              className="form-input"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Opening Balance</label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter Opening Balance"
              className="form-input"
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

export default AddPartyModal;
