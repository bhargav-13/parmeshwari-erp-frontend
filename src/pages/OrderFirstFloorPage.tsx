import React from 'react';
import { OrderFloor } from '../types';
import OrderFloorPage from './OrderFloorPage';

const OrderFirstFloorPage: React.FC = () => <OrderFloorPage floor={OrderFloor.FIRST_FLOOR} floorLabel="First Floor" />;

export default OrderFirstFloorPage;
