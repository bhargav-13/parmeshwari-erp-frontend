import React, { useState, useEffect } from 'react';
import type { Party, CromeRequest, SubcontractingCromeInfo } from '../types';
import { PackagingType } from '../types';
import { cromeApi } from '../api/crome';
import './AddSubcontractingModal.css';
import './CromeModal.css';

interface CromeModalProps {
  subcontractingId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CromeModal: React.FC<CromeModalProps> = ({ subcontractingId, onClose, onSuccess }) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [cromeInfo, setCromeInfo] = useState<SubcontractingCromeInfo | null>(null);
  const [formData, setFormData] = useState<{ partyId: string; cromeDate: string; sentStock: string; packagingType: PackagingType; packagingWeight: string; packagingCount: string; remark: string; }>({
    partyId: '',
    cromeDate: new Date().toISOString().split('T')[0],
    sentStock: '',
    packagingType: PackagingType.PETI,
    packagingWeight: '',
    packagingCount: '',
    remark: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [addingParty, setAddingParty] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [partiesData, infoData] = await Promise.all([
          cromeApi.getPartyList(),
          cromeApi.getSubcontractingCromeInfo(subcontractingId),
        ]);
        setParties(partiesData);
        setCromeInfo(infoData);

        // Pre-fill fields from return info
        setFormData(prev => ({
          ...prev,
          // Always pre-fill sentStock with what's available
          sentStock: (infoData.availableStockForCrome || 0).toString(),
          // Pre-fill packaging info if available
          ...(infoData.returnPackagingType ? {
            packagingType: infoData.returnPackagingType,
            packagingWeight: infoData.returnPackagingWeight?.toString() || '',
            packagingCount: infoData.returnPackagingCount?.toString() || '',
          } : {})
        }));
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [subcontractingId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  const validateField = (name: string, value: any): string | null => {
    switch (name) {
      case 'partyId': return !value ? 'Select a party' : null;
      case 'cromeDate': return !value ? 'Date is required' : null;
      case 'sentStock':
        if (!value || parseFloat(value) <= 0) return 'Sent stock required';
        if (cromeInfo && parseFloat(value) > cromeInfo.availableStockForCrome) return 'Exceeds available stock';
        return null;
      case 'packagingWeight': return !value || parseFloat(value) <= 0 ? 'Weight required' : null;
      case 'packagingCount': return !value || parseInt(value) <= 0 ? 'Count required' : null;
      default: return null;
    }
  };

  const getFieldError = (name: string) => {
    if (!touched[name]) return null;
    return validateField(name, formData[name as keyof typeof formData]);
  };

  const handleAddParty = async () => {
    if (!newPartyName.trim()) return;

    try {
      setAddingParty(true);
      const newParty = await cromeApi.addParty(newPartyName.trim());
      setParties((prev) => [...prev, newParty]);
      setFormData((prev) => ({ ...prev, partyId: String(newParty.partyId) }));
      setNewPartyName('');
      setShowAddParty(false);
    } catch (err) {
      console.error('Error adding party:', err);
      setError('Failed to add party');
    } finally {
      setAddingParty(false);
    }
  };

  // Calculate gross weight
  const calculateGrossWeight = (): number => {
    const sentStock = parseFloat(formData.sentStock) || 0;
    const packagingWeight = parseFloat(formData.packagingWeight) || 0;
    const packagingCount = parseInt(formData.packagingCount) || 0;
    return sentStock + (packagingWeight * packagingCount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Mark all touched
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    const errors = Object.keys(formData).map(key => validateField(key, formData[key as keyof typeof formData])).filter(Boolean);
    if (errors.length > 0) return;

    const sentStock = parseFloat(formData.sentStock);
    const packagingWeight = parseFloat(formData.packagingWeight);
    const packagingCount = parseInt(formData.packagingCount);

    const submitData: CromeRequest = {
      subcontractingId: subcontractingId,
      partyId: parseInt(formData.partyId, 10),
      cromeDate: formData.cromeDate,
      sentStock: sentStock,
      packagingType: formData.packagingType as PackagingType,
      packagingWeight: packagingWeight,
      packagingCount: packagingCount,
      remark: formData.remark || null,
    };

    try {
      setLoading(true);
      await cromeApi.addCrome(submitData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create crome');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content crome-modal" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Send to Crome</h2>
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content crome-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Send to Crome</h2>

        {cromeInfo && (
          <div className="crome-info-section">
            <div className="info-row">
              <span className="info-label">Contractor:</span>
              <span className="info-value">{cromeInfo.contractorName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Item:</span>
              <span className="info-value">{cromeInfo.itemName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Available Stock:</span>
              <span className="info-value available-stock">
                {cromeInfo.availableStockForCrome.toFixed(3)} {cromeInfo.unit}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-group">
            <label className="form-label">Party:</label>
            <div className="dropdown-with-add">
              <select
                name="partyId"
                value={formData.partyId}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('partyId') ? 'invalid' : ''}`}
                title="Select Party"
                required
              >
                <option value="">Select Party</option>
                {parties.map((party) => (
                  <option key={party.partyId} value={party.partyId}>
                    {party.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-new-btn"
                onClick={() => setShowAddParty(!showAddParty)}
                title="Add new party"
              >
                +
              </button>
            </div>
            {getFieldError('partyId') && <span className="field-error-text">{getFieldError('partyId')}</span>}

            {showAddParty && (
              <div className="add-new-input-group">
                <input
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Enter party name"
                  className="form-input add-new-input"
                />
                <button
                  type="button"
                  className="add-confirm-btn"
                  onClick={handleAddParty}
                  disabled={addingParty || !newPartyName.trim()}
                >
                  {addingParty ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Crome Date:</label>
              <input
                type="date"
                name="cromeDate"
                value={formData.cromeDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('cromeDate') ? 'invalid' : ''}`}
                required
              />
              {getFieldError('cromeDate') && <span className="field-error-text">{getFieldError('cromeDate')}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Sent Stock ({cromeInfo?.unit || 'KG'}):</label>
              <input
                type="number"
                name="sentStock"
                value={formData.sentStock}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter net stock"
                className={`form-input ${getFieldError('sentStock') ? 'invalid' : ''}`}
                step="0.001"
                min="0"
                max={cromeInfo?.availableStockForCrome}
                required
              />
              {getFieldError('sentStock') && <span className="field-error-text">{getFieldError('sentStock')}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Packaging:</label>
            <div className="packaging-row">
              <select
                name="packagingType"
                value={formData.packagingType}
                onChange={handleChange}
                className="form-input packaging-type"
                required
              >
                <option value={PackagingType.BAG}>Bag</option>
                <option value={PackagingType.FOAM}>Foam</option>
                <option value={PackagingType.PETI}>Peti</option>
                <option value={PackagingType.DRUM}>Drum</option>
              </select>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="number"
                  name="packagingWeight"
                  value={formData.packagingWeight}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Weight (KG)"
                  className={`form-input packaging-weight ${getFieldError('packagingWeight') ? 'invalid' : ''}`}
                  step="0.001"
                  min="0"
                  required
                />
                {getFieldError('packagingWeight') && <span className="field-error-text">{getFieldError('packagingWeight')}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="number"
                  name="packagingCount"
                  value={formData.packagingCount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Count"
                  className={`form-input packaging-count ${getFieldError('packagingCount') ? 'invalid' : ''}`}
                  step="1"
                  min="1"
                  required
                />
                {getFieldError('packagingCount') && <span className="field-error-text">{getFieldError('packagingCount')}</span>}
              </div>
            </div>
          </div>

          <div className="calculation-summary">
            <div className="calc-row">
              <span className="calc-label">Net Stock:</span>
              <span className="calc-value">{(parseFloat(formData.sentStock) || 0).toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Packaging Weight:</span>
              <span className="calc-value">+ {((parseFloat(formData.packagingWeight) || 0) * (parseInt(formData.packagingCount) || 0)).toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
            <div className="calc-row calc-row-formula">
              <span className="calc-formula">({formData.packagingCount || 0} x {formData.packagingWeight || 0} KG)</span>
            </div>
            <div className="calc-row total-row">
              <span className="calc-label">Gross Weight:</span>
              <span className="calc-value total">{calculateGrossWeight().toFixed(3)} {cromeInfo?.unit || 'KG'}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remark:</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Enter remark (optional)"
              className="form-textarea"
              rows={2}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send to Crome'}
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

export default CromeModal;

