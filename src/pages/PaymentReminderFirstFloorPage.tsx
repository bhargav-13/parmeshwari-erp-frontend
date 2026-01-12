import React from 'react';
import PaymentReminderPage from './PaymentReminderPage';
import { PaymentFloor, BillingType } from '../types';

const PaymentReminderFirstFloorPage: React.FC = () => {
  return <PaymentReminderPage floor={PaymentFloor.FIRST_FLOOR} mode={BillingType.OFFICIAL} />;
};

export default PaymentReminderFirstFloorPage;
