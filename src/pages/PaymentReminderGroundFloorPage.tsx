import React from 'react';
import PaymentReminderPage from './PaymentReminderPage';
import { PaymentFloor, BillingType } from '../types';

const PaymentReminderGroundFloorPage: React.FC = () => {
  return <PaymentReminderPage floor={PaymentFloor.GROUND_FLOOR} mode={BillingType.OFFICIAL} />;
};

export default PaymentReminderGroundFloorPage;
