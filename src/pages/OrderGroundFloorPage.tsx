import React from 'react';
import { OrderFloor } from '../types';
import OrderFloorPage from './OrderFloorPage';

const OrderGroundFloorPage: React.FC = () => <OrderFloorPage floor={OrderFloor.GROUND_FLOOR} floorLabel="Ground Floor" />;

export default OrderGroundFloorPage;
