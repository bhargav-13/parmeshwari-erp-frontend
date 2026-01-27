import React, { useState } from 'react';
import type { PartyRequest } from '../types';
import './AddPartyModal.css';

interface AddPartyModalProps {
  onClose: () => void;
  onSubmit: (data: PartyRequest) => Promise<void>;
}

const AddPartyModal: React.FC<AddPartyModalProps> = ({ onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Party name is required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({ name: name.trim() });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content party-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add Party</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="partyName">Party Name*</label>
            <input
              type="text"
              id="partyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Enter party name"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

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
