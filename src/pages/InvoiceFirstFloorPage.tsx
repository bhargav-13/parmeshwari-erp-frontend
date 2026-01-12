import React from 'react';
import InvoicePage from './InvoicePage';
import { InvoiceFloor, BillingType } from '../types';

const InvoiceFirstFloorPage: React.FC = () => {
  return <InvoicePage floor={InvoiceFloor.FIRST_FLOOR} mode={BillingType.OFFICIAL} />;
};

export default InvoiceFirstFloorPage;
