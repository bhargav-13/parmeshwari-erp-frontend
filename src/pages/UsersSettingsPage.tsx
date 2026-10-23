import React, { useEffect, useState } from 'react';
import type { User } from '../types';
import { UserGroup } from '../types';
import Loading from '../components/Loading';
import { usersApi, apiErrorMessage } from '../api/users';
import { isOwner } from '../lib/auth';
import SearchIcon from '../assets/search.svg';
import './InventoryPage.css';
import './UsersSettingsPage.css';

const ROLE_HELP: { role: UserGroup; text: string }[] = [
  { role: UserGroup.Owner, text: 'Everything, including Cashflow, Settings and Owner-only actions.' },
  { role: UserGroup.Admin, text: 'Everything, including Cashflow and Settings. Cannot manage Owner logins.' },
  { role: UserGroup.GroundFloor, text: 'Ground floor orders, invoices, payments, stock, products, parties and purchases, plus Casting and the shared modules.' },
  { role: UserGroup.FirstFloor, text: 'First floor orders, invoices, payments, stock, products, parties and purchases, plus the shared modules.' },
];

const ROLE_ORDER: UserGroup[] = [UserGroup.Owner, UserGroup.Admin, UserGroup.GroundFloor, UserGroup.FirstFloor];

const roleClass = (role: string) => `role-chip role-${role.toLowerCase().replace(' ', '-')}`;

/** Settings › Users & Roles, for Admin and Owner. The server enforces every rule shown here. */
const UsersSettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);

  const me = (localStorage.getItem('userEmail') || '').toLowerCase();
  const owner = isOwner();
  // Only an Owner may give, change or remove the Owner role
  const canManage = (user: User) => owner || user.userGroup !== UserGroup.Owner;
  const assignableRoles = ROLE_ORDER.filter((r) => owner || r !== UserGroup.Owner);

  const load = async () => {
    try {
      setLoading(true);
      const result = await usersApi.getUsers();
      setUsers(
        [...result.data].sort(
          (a, b) => ROLE_ORDER.indexOf(a.userGroup) - ROLE_ORDER.indexOf(b.userGroup) || a.email.localeCompare(b.email)
        )
      );
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (user: User, action: () => Promise<unknown>, done: string) => {
    setError(null);
    setNotice(null);
    try {
      setBusyId(user.id);
      await action();
      setNotice(done);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, 'That change was not saved.'));
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (user: User, role: UserGroup) => {
    if (role === user.userGroup) return;
    if (!window.confirm(`Change ${user.email} from ${user.userGroup} to ${role}?`)) return;
    run(user, () => usersApi.changeRole(user.id, role), `${user.email} is now ${role}.`);
  };

  const toggleEnabled = (user: User) => {
    const turningOff = user.enabled;
    if (turningOff && !window.confirm(`Turn off ${user.email}? They will not be able to sign in.`)) return;
    run(
      user,
      () => usersApi.setEnabled(user.id, !turningOff),
      turningOff ? `${user.email} can no longer sign in.` : `${user.email} can sign in again.`
    );
  };

  const remove = (user: User) => {
    if (!window.confirm(`Delete the login ${user.email}? This cannot be undone.`)) return;
    run(user, () => usersApi.deleteUser(user.id), `${user.email} was deleted.`);
  };

  const filtered = users.filter((u) => u.email.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading && users.length === 0) {
    return <Loading message="Loading users..." />;
  }

  return (
    <div className="inventory-page users-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Users &amp; Roles</h1>
          <p className="page-subtitle">Who can sign in, and what each role can open</p>
        </div>
        <div className="header-actions">
          <button type="button" className="action-button primary-button" onClick={() => setAdding(true)}>
            <span className="button-icon">+</span>
            <span className="button-text">Add User</span>
          </button>
        </div>
      </div>

      <div className="role-legend">
        {ROLE_HELP.map(({ role, text }) => (
          <div key={role} className="role-legend-item">
            <span className={roleClass(role)}>{role}</span>
            <span className="role-legend-text">{text}</span>
          </div>
        ))}
      </div>

      {error && <div className="users-banner users-banner-error" role="alert">{error}</div>}
      {notice && <div className="users-banner users-banner-ok" role="status">{notice}</div>}

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            id="users-search"
            type="text"
            placeholder="Search by email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="users-empty">No users match “{search}”.</td>
              </tr>
            )}
            {filtered.map((user) => {
              const isMe = user.email.toLowerCase() === me;
              const manageable = canManage(user);
              const busy = busyId === user.id;
              return (
                <tr key={user.id} className={user.enabled ? '' : 'users-row-off'}>
                  <td>
                    {user.email}
                    {isMe && <span className="users-you">You</span>}
                  </td>
                  <td>
                    {manageable ? (
                      <select
                        id={`role-${user.id}`}
                        className="form-input users-role-select"
                        value={user.userGroup}
                        disabled={busy}
                        onChange={(e) => changeRole(user, e.target.value as UserGroup)}
                        aria-label={`Role of ${user.email}`}
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={roleClass(user.userGroup)} title="Only an Owner can change this">
                        {user.userGroup}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`users-status ${user.enabled ? 'on' : 'off'}`}>
                      {user.enabled ? 'Can sign in' : 'Turned off'}
                    </span>
                  </td>
                  <td>
                    {manageable ? (
                      <div className="users-actions">
                        <button type="button" className="users-action" disabled={busy} onClick={() => setResetting(user)}>
                          Reset password
                        </button>
                        {!isMe && (
                          <button type="button" className="users-action" disabled={busy} onClick={() => toggleEnabled(user)}>
                            {user.enabled ? 'Turn off' : 'Turn on'}
                          </button>
                        )}
                        {!isMe && (
                          <button type="button" className="users-action danger" disabled={busy} onClick={() => remove(user)}>
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="users-muted">Owner only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddUserModal
          roles={assignableRoles}
          onClose={() => setAdding(false)}
          onSaved={(email) => {
            setAdding(false);
            setError(null);
            setNotice(`${email} can now sign in.`);
            load();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => {
            setNotice(`Password changed for ${resetting.email}.`);
            setResetting(null);
          }}
        />
      )}
    </div>
  );
};

const AddUserModal: React.FC<{
  roles: UserGroup[];
  onClose: () => void;
  onSaved: (email: string) => void;
}> = ({ roles, onClose, onSaved }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserGroup>(UserGroup.GroundFloor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await usersApi.createUser(email.trim(), password, role);
      onSaved(email.trim());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not add the user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add User</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={submit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="new-user-email">Email*</label>
            <input
              id="new-user-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@parmeshwaribrass.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-user-password">Password*</label>
            <input
              id="new-user-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="new-user-role">Role*</label>
            <select
              id="new-user-role"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserGroup)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? 'Adding...' : 'Add User'}
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

const ResetPasswordModal: React.FC<{
  user: User;
  onClose: () => void;
  onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await usersApi.resetPassword(user.id, password);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Reset Password</h2>
        <p className="users-modal-sub">{user.email}</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={submit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">New password*</label>
            <input
              id="reset-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? 'Saving...' : 'Set Password'}
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

export default UsersSettingsPage;
