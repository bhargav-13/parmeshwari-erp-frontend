import React from 'react';
import InvoicePage from './InvoicePage';
import { InvoiceFloor, BillingType } from '../types';

const InvoiceGroundFloorPage: React.FC = () => {
  return <InvoicePage floor={InvoiceFloor.GROUND_FLOOR} mode={BillingType.OFFICIAL} />;
};

export default InvoiceGroundFloorPage;
