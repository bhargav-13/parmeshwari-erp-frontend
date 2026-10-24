import React from 'react';
import { getUserFloor, type UserFloor } from '../lib/auth';

interface StatementFloorSelectProps {
  value: UserFloor | '';
  onChange: (floor: UserFloor | '') => void;
  disabled?: boolean;
}

/**
 * Lets Admin and Owner download a statement for one floor or both. Floor staff always get their
 * own floor from the server, so nothing is shown for them.
 */
const StatementFloorSelect: React.FC<StatementFloorSelectProps> = ({ value, onChange, disabled }) => {
  if (getUserFloor() !== null) return null;
  return (
    <select
      className="statement-floor-select"
      value={value}
      onChange={(e) => onChange(e.target.value as UserFloor | '')}
      disabled={disabled}
      aria-label="Floor for the statement"
      title="Floor for the statement"
      style={{
        padding: '0.45rem 0.6rem',
        borderRadius: '8px',
        border: '1px solid #d6dbe1',
        fontSize: '0.875rem',
        background: '#fff',
      }}
    >
      <option value="">Both floors</option>
      <option value="GROUND_FLOOR">Ground Floor</option>
      <option value="FIRST_FLOOR">First Floor</option>
    </select>
  );
};

export default StatementFloorSelect;
