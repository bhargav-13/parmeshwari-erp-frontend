import React, { useState, useEffect } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type { SubcontractingBySubcontractInfo } from '../types';
import SubcontractViewModal from '../components/SubcontractViewModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import DownloadIcon from '../assets/download.svg';
import ViewIcon from '../assets/view.svg';
import './SubcontractPage.css';

const SubcontractPage: React.FC = () => {
  const [subcontractors, setSubcontractors] = useState<SubcontractingBySubcontractInfo[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<SubcontractingBySubcontractInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'item'>('name');
  const [loading, setLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [downloadingContractor, setDownloadingContractor] = useState<string | null>(null);
  // Contractor whose PDF date-range popup is open
  const [pdfContractor, setPdfContractor] = useState<string | null>(null);
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    filterSubcontractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchBy, subcontractors]);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const response = await subcontractingApi.getSubcontractingListBySubcontract();
      setSubcontractors(response);
      setFilteredSubcontractors(response);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubcontractors = () => {
    if (!searchQuery) {
      setFilteredSubcontractors(subcontractors);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = subcontractors.filter((contractor) => {
      if (searchBy === 'name') {
        return contractor.contractorName.toLowerCase().includes(query);
      }
      return contractor.itemName.toLowerCase().includes(query);
    });
    setFilteredSubcontractors(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleView = (contractorName: string) => {
    setSelectedContractor(contractorName);
    setIsViewModalOpen(true);
  };

  // yyyy-mm-dd in local time (toISOString would shift to the previous day in IST)
  const toInputDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const openPdfDialog = (contractorName: string) => {
    const today = new Date();
    setPdfStartDate(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    setPdfEndDate(toInputDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    setPdfContractor(contractorName);
  };

  const pdfRangeInvalid = !pdfStartDate || !pdfEndDate || pdfStartDate > pdfEndDate;

  const handleDownload = async (contractorName: string, startDate: string, endDate: string) => {
    try {
      setDownloadingContractor(contractorName);

      const blob = await subcontractingApi.getSubcontractByCustomerNamePdf(contractorName, startDate, endDate);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contractorName}_subcontract_${formatDate(startDate)}_to_${formatDate(endDate)}.pdf`.replace(/\//g, '-');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setPdfContractor(null);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingContractor(null);
    }
  };

  return (
    <div className="subcontract-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Subcontractors</h1>
          <p className="page-subtitle">Manage Subcontractors Data</p>
        </div>
      </div>

      <div className="subcontract-filters">
        <div className="subcontract-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="subcontract-search-by">
          <select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value as 'name' | 'item')}
            title="Search by"
          >
            <option value="name">Names</option>
            <option value="item">Items</option>
          </select>
        </div>
      </div>

      <div className="subcontract-table-container">
        {loading ? (
          <Loading message="Loading subcontractors..." size="large" />
        ) : filteredSubcontractors.length === 0 ? (
          <div className="no-data">No subcontractors found.</div>
        ) : (
          <table className="subcontract-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Last Update</th>
                <th>Item</th>
                <th>Download</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubcontractors.map((contractor, index) => (
                <tr key={`${contractor.contractorName}-${index}`}>
                  <td>{contractor.contractorName}</td>
                  <td>{formatDate(contractor.lastUpdatedAt)}</td>
                  <td>{contractor.itemName}</td>
                  <td>
                    <button
                      type="button"
                      className={`action-button download-button ${downloadingContractor === contractor.contractorName ? 'downloading' : ''}`}
                      onClick={() => openPdfDialog(contractor.contractorName)}
                      title="Download PDF"
                      disabled={downloadingContractor === contractor.contractorName}
                    >
                      {downloadingContractor === contractor.contractorName ? (
                        <>
                          <span className="download-spinner"></span>
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <img src={DownloadIcon} alt="Download" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-button view-button"
                      onClick={() => handleView(contractor.contractorName)}
                      title="View Details"
                    >
                      <img src={ViewIcon} alt="View" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pdfContractor && (
        <div className="pdf-range-overlay" onClick={() => setPdfContractor(null)}>
          <div className="pdf-range-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2 className="pdf-range-title">Download PDF</h2>
            <p className="pdf-range-subtitle">{pdfContractor}</p>
            <div className="pdf-range-fields">
              <label className="pdf-range-field">
                <span>Start Date</span>
                <input type="date" value={pdfStartDate} max={pdfEndDate || undefined} onChange={(e) => setPdfStartDate(e.target.value)} />
              </label>
              <label className="pdf-range-field">
                <span>End Date</span>
                <input type="date" value={pdfEndDate} min={pdfStartDate || undefined} onChange={(e) => setPdfEndDate(e.target.value)} />
              </label>
            </div>
            {pdfStartDate && pdfEndDate && pdfStartDate > pdfEndDate && (
              <p className="pdf-range-error">Start date must be on or before end date.</p>
            )}
            <div className="pdf-range-actions">
              <button type="button" className="pdf-range-cancel" onClick={() => setPdfContractor(null)} disabled={downloadingContractor === pdfContractor}>
                Cancel
              </button>
              <button
                type="button"
                className="pdf-range-download"
                onClick={() => handleDownload(pdfContractor, pdfStartDate, pdfEndDate)}
                disabled={pdfRangeInvalid || downloadingContractor === pdfContractor}
              >
                {downloadingContractor === pdfContractor ? 'Downloading…' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedContractor && (
        <SubcontractViewModal
          contractorName={selectedContractor}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedContractor(null);
          }}
        />
      )}
    </div>
  );
};

export default SubcontractPage;
