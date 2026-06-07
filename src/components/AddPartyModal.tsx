import React, { useState, useEffect } from 'react';
import type { Party, Floor } from '../types';
import './AddProductModal.css'; // Reuse existing styles
import { partyApi } from '../api/party';

interface AddPartyModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Party;
}

const AddPartyModal: React.FC<AddPartyModalProps> = ({ onClose, onSuccess, initialData }) => {
  const [name, setName] = useState('');
  const [officialAmount, setOfficialAmount] = useState<number | ''>('');
  const [offlineAmount, setOfflineAmount] = useState<number | ''>('');
  const [floor, setFloor] = useState<Floor | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setOfficialAmount(initialData.officialAmount);
      setOfflineAmount(initialData.offlineAmount);
      setFloor(initialData.floor ?? '');
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

      const partyData = {
        name: name.trim(),
        officialAmount: Number(officialAmount) || 0,
        offlineAmount: Number(offlineAmount) || 0,
        ...(floor ? { floor } : {}),
      };

      if (initialData) {
        await partyApi.updateParty(initialData.partyId, partyData);
      } else {
        await partyApi.createParty(partyData);
      }

      onSuccess();
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
            <label className="form-label">Official Amount</label>
            <input
              type="number"
              value={officialAmount}
              onChange={(e) => setOfficialAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter Official Amount"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Offline Amount</label>
            <input
              type="number"
              value={offlineAmount}
              onChange={(e) => setOfflineAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter Offline Amount"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Floor</label>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value as Floor | '')}
              className="form-input"
            >
              <option value="">-- Select Floor --</option>
              <option value="GROUND_FLOOR">Ground Floor</option>
              <option value="FIRST_FLOOR">First Floor</option>
            </select>
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
