import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  CheckCircle,
  PlusCircle,
  UserPlus,
  Ticket,
  Clock,
  UserCheck,
  Building,
  AlertCircle,
  Search,
  Check,
  X,
  Trash2,
  TrendingUp
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'summary', 'organiser', 'checkin', 'users'
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    openEvents: 0,
    totalRegistrations: 0,
    totalCheckedIn: 0,
  });

  const [events, setEvents] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form states
  const [newEvent, setNewEvent] = useState({ ename: '', datetime: '', capacity: 20, organiser_id: '' });
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'participant' });
  const [selectedUserId, setSelectedUserId] = useState('');

  // Check-in search / filter
  const [checkinFilter, setCheckinFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, eventsRes, topEventsRes, usersRes, regsRes, checkinsRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()),
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/events/top-registered').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/registrations').then((r) => r.json()),
        fetch('/api/checkins').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (eventsRes.success) setEvents(eventsRes.data);
      if (topEventsRes.success) setTopEvents(topEventsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (regsRes.success) setRegistrations(regsRes.data);
      if (checkinsRes.success) setCheckins(checkinsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to connect to backend server. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      }).then((r) => r.json());

      if (res.success) {
        setShowCreateEventModal(false);
        setNewEvent({ ename: '', datetime: '', capacity: 20, organiser_id: '' });
        fetchData();
      } else {
        alert('Error creating event: ' + res.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      }).then((r) => r.json());

      if (res.success) {
        setShowCreateUserModal(false);
        setNewUser({ name: '', email: '', role: 'participant' });
        fetchData();
      } else {
        alert('Error creating user: ' + res.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedEvent) return;

    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, eid: selectedEvent.eid }),
      }).then((r) => r.json());

      if (res.success) {
        setShowRegisterModal(false);
        setSelectedEvent(null);
        setSelectedUserId('');
        fetchData();
      } else {
        alert('Registration error: ' + res.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handleCancelRegistration = async (reg_id) => {
    if (!window.confirm('Are you sure you want to cancel this registration? Capacity will be freed.')) return;

    try {
      const res = await fetch('/api/registrations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_id }),
      }).then((r) => r.json());

      if (res.success) {
        fetchData();
      } else {
        alert('Cancellation failed: ' + res.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const handlePerformCheckin = async (reg_id, eid) => {
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reg_id, eid }),
      }).then((r) => r.json());

      if (res.success) {
        fetchData();
      } else {
        alert('Check-in Error: ' + res.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const filteredCheckins = checkins.filter(
    (c) =>
      c.participant_name.toLowerCase().includes(checkinFilter.toLowerCase()) ||
      c.event_name.toLowerCase().includes(checkinFilter.toLowerCase()) ||
      c.participant_email.toLowerCase().includes(checkinFilter.toLowerCase())
  );

  return (
    <div className="container">
      {/* Navbar */}
      <header className="navbar">
        <div className="brand">
          <Ticket size={28} color="#818cf8" />
          <span>EventHub Pass System</span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            <Calendar size={18} /> Events & Passes
          </button>
          <button
            className={`nav-tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <TrendingUp size={18} /> Event Summary & SQL Task
          </button>
          <button
            className={`nav-tab ${activeTab === 'organiser' ? 'active' : ''}`}
            onClick={() => setActiveTab('organiser')}
          >
            <Building size={18} /> Organiser Portal
          </button>
          <button
            className={`nav-tab ${activeTab === 'checkin' ? 'active' : ''}`}
            onClick={() => setActiveTab('checkin')}
          >
            <UserCheck size={18} /> Check-In Station
          </button>
          <button
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} /> Users
          </button>
        </nav>
      </header>

      {/* Metrics Banner */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalEvents}</div>
            <div className="stat-lbl">Total Events ({stats.openEvents} Open)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <Ticket size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalRegistrations}</div>
            <div className="stat-lbl">Active Registrations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalCheckedIn}</div>
            <div className="stat-lbl">Checked-In Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalUsers}</div>
            <div className="stat-lbl">Students & Users</div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* 1. EVENTS CATALOG & REGISTRATIONS */}
      {activeTab === 'events' && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Technical Events Catalog</h2>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateUserModal(true)}>
                <UserPlus size={18} /> Add Student / User
              </button>
            </div>
          </div>

          <div className="cards-grid" style={{ marginBottom: '2.5rem' }}>
            {events.map((ev) => (
              <div className="card" key={ev.eid}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className="card-title">{ev.ename}</h3>
                  <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} /> Date: {ev.datetime}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} /> Organiser: {ev.organiser_name || 'College Organiser'}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span>Capacity & Available Seats</span>
                      <strong style={{ color: ev.seats > 0 ? '#34d399' : '#ef4444' }}>
                        {ev.seats} left / {ev.capacity} total
                      </strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, ((ev.capacity - ev.seats) / ev.capacity) * 100))}%`,
                          background: ev.seats > 0 ? 'linear-gradient(90deg, #818cf8, #34d399)' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: '0.5rem' }}
                  disabled={ev.status !== 'open' || ev.seats <= 0}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setShowRegisterModal(true);
                  }}
                >
                  <Ticket size={18} />
                  {ev.seats > 0 ? 'Register Student (Issue Pass)' : 'Capacity Reached (Blocked)'}
                </button>
              </div>
            ))}
          </div>

          {/* Active Registrations List (With Cancel Pass Option) */}
          <div className="section-header">
            <h2 className="section-title">Issued Passes & Active Registrations</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pass / Reg ID</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Event Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No active registrations.</td>
                  </tr>
                ) : (
                  registrations.map((r) => (
                    <tr key={r.reg_id}>
                      <td style={{ fontWeight: 700, color: '#818cf8' }}>#{r.reg_id}</td>
                      <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.user_email}</td>
                      <td>{r.ename}</td>
                      <td>
                        <span className={`badge ${r.reg_status === 'confirmed' ? 'badge-open' : 'badge-closed'}`}>
                          {r.reg_status}
                        </span>
                      </td>
                      <td>
                        {r.reg_status === 'confirmed' ? (
                          <button
                            className="btn btn-secondary"
                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                            onClick={() => handleCancelRegistration(r.reg_id)}
                          >
                            <Trash2 size={16} /> Cancel Pass
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. VIEW EVENT SUMMARY & SQL TASK TAB */}
      {activeTab === 'summary' && (
        <section>
          {/* Use Case 5: View Event Summary */}
          <div className="section-header">
            <h2 className="section-title">Use Case 5: Event Summary</h2>
          </div>

          <div className="table-container" style={{ marginBottom: '2.5rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event Name</th>
                  <th>Max Capacity</th>
                  <th>Registered Count</th>
                  <th>Checked-In Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.eid}>
                    <td>#{ev.eid}</td>
                    <td style={{ fontWeight: 700 }}>{ev.ename}</td>
                    <td>{ev.capacity}</td>
                    <td style={{ fontWeight: 600, color: '#818cf8' }}>{ev.registered_count || 0}</td>
                    <td style={{ fontWeight: 600, color: '#34d399' }}>{ev.checkedin_count || 0}</td>
                    <td>
                      <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SQL Task: Highest Registrations */}
          <div className="section-header">
            <h2 className="section-title">SQL Task: Top Events by Total Registrations</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sorted by registration count descending</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Event Name</th>
                  <th>Total Registrations</th>
                  <th>Capacity</th>
                  <th>Seats Remaining</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((ev, index) => (
                  <tr key={ev.eid}>
                    <td style={{ fontWeight: 800, color: index === 0 ? '#fbbf24' : 'var(--text-main)' }}>
                      #{index + 1}
                    </td>
                    <td style={{ fontWeight: 700 }}>{ev.ename}</td>
                    <td style={{ fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>
                      {ev.total_registrations}
                    </td>
                    <td>{ev.capacity}</td>
                    <td>{ev.seats}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. ORGANISER PORTAL TAB */}
      {activeTab === 'organiser' && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Use Case 1: Create & Manage Events</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateEventModal(true)}>
              <PlusCircle size={18} /> Create Event
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Event Name</th>
                  <th>Date & Time</th>
                  <th>Assigned Organiser</th>
                  <th>Capacity</th>
                  <th>Available Seats</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.eid}>
                    <td>#{ev.eid}</td>
                    <td style={{ fontWeight: 600 }}>{ev.ename}</td>
                    <td>{ev.datetime}</td>
                    <td>{ev.organiser_name || 'Default Organiser'}</td>
                    <td>{ev.capacity}</td>
                    <td style={{ color: ev.seats > 0 ? '#34d399' : '#ef4444', fontWeight: 700 }}>{ev.seats}</td>
                    <td>
                      <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. CHECK-IN STATION TAB */}
      {activeTab === 'checkin' && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Use Case 4: Event Day Student Check-In</h2>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '2.4rem', width: '100%' }}
                placeholder="Search registered student..."
                value={checkinFilter}
                onChange={(e) => setCheckinFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reg Pass ID</th>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Event Name</th>
                  <th>Check-In Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheckins.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No check-in records found.</td>
                  </tr>
                ) : (
                  filteredCheckins.map((c) => (
                    <tr key={c.checkin_id}>
                      <td style={{ fontWeight: 700, color: '#818cf8' }}>#{c.reg_id}</td>
                      <td style={{ fontWeight: 600 }}>{c.participant_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.participant_email}</td>
                      <td>{c.event_name}</td>
                      <td>
                        <span className={`badge badge-${c.checkin_status}`}>
                          {c.checkin_status === 'checked_in' ? 'Checked In' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {c.checkin_status === 'checked_in' ? (
                          <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle size={16} /> Completed (Only Once)
                          </span>
                        ) : (
                          <button
                            className="btn btn-success"
                            onClick={() => handlePerformCheckin(c.reg_id, c.eid)}
                          >
                            <Check size={16} /> Perform Check-In
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. USER DIRECTORY TAB */}
      {activeTab === 'users' && (
        <section>
          <div className="section-header">
            <h2 className="section-title">Students & Users Directory</h2>
            <button className="btn btn-primary" onClick={() => setShowCreateUserModal(true)}>
              <UserPlus size={18} /> Add Student / User
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{ background: u.role === 'organiser' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)', color: u.role === 'organiser' ? '#818cf8' : 'var(--text-main)' }}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODALS */}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create Technical Event (UC-1)</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowCreateEventModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">Event Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={newEvent.ename}
                  onChange={(e) => setNewEvent({ ...newEvent, ename: e.target.value })}
                  placeholder="e.g., Hackathon 2026"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Date & Time</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={newEvent.datetime}
                  onChange={(e) => setNewEvent({ ...newEvent, datetime: e.target.value })}
                  placeholder="e.g., 2026-10-25 10:00 AM"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Capacity</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  required
                  value={newEvent.capacity}
                  onChange={(e) => setNewEvent({ ...newEvent, capacity: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Organiser</label>
                <select
                  className="form-control"
                  value={newEvent.organiser_id}
                  onChange={(e) => setNewEvent({ ...newEvent, organiser_id: e.target.value })}
                >
                  <option value="">Select Organiser...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateEventModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Event (Status = Open)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Student Modal */}
      {showRegisterModal && selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register Student for Event (UC-2)</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowRegisterModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRegister}>
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedEvent.ename}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedEvent.datetime}</div>
                <div style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
                  Available Capacity: {selectedEvent.seats} / {selectedEvent.capacity}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select
                  className="form-control"
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose student...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!selectedUserId}>
                  Register & Issue Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Student / User</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowCreateUserModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@college.edu"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-control"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="participant">Student (Participant)</option>
                  <option value="organiser">Organiser</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Student / User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
