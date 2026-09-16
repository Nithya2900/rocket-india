import express from 'express';
import cors from 'cors';
import db, { initDb, run, get, all } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Database
initDb().catch((err) => {
  console.error('Failed to initialize database:', err);
});

// --- USERS API ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await all(`SELECT * FROM User ORDER BY id DESC`);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, role = 'participant' } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required' });
  }

  try {
    const result = await run(
      `INSERT INTO User (name, email, role) VALUES (?, ?, ?)`,
      [name, email, role]
    );
    const newUser = await get(`SELECT * FROM User WHERE id = ?`, [result.lastID]);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- EVENTS API ---
app.get('/api/events', async (req, res) => {
  try {
    const events = await all(`
      SELECT 
        e.*,
        o.id as organiser_user_id,
        u.name as organiser_name,
        (SELECT COUNT(*) FROM Registration r WHERE r.eid = e.eid AND r.status = 'confirmed') as registered_count,
        (SELECT COUNT(*) FROM CheckIn c JOIN Registration r ON c.reg_id = r.reg_id WHERE c.eid = e.eid AND c.checkin_status = 'checked_in' AND r.status = 'confirmed') as checkedin_count
      FROM Event e
      LEFT JOIN organiser o ON e.eid = o.eid
      LEFT JOIN User u ON o.id = u.id
      ORDER BY e.eid DESC
    `);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SQL Task Endpoint: Display events with highest registrations, sorted descending
app.get('/api/events/top-registered', async (req, res) => {
  try {
    const topEvents = await all(`
      SELECT 
        e.eid,
        e.ename,
        e.capacity,
        e.seats,
        COUNT(r.reg_id) as total_registrations
      FROM Event e
      LEFT JOIN Registration r ON e.eid = r.eid AND r.status = 'confirmed'
      GROUP BY e.eid, e.ename, e.capacity, e.seats
      ORDER BY total_registrations DESC, e.ename ASC
    `);
    res.json({ success: true, data: topEvents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  const { ename, datetime, capacity, organiser_id } = req.body;

  if (!ename || !datetime || !capacity) {
    return res.status(400).json({ success: false, error: 'Event name, datetime, and capacity are required' });
  }

  const cap = parseInt(capacity, 10);
  if (isNaN(cap) || cap <= 0) {
    return res.status(400).json({ success: false, error: 'Capacity must be a positive integer' });
  }

  try {
    // Insert Event with status = 'open' (Use Case 1)
    const eventResult = await run(
      `INSERT INTO Event (ename, datetime, capacity, seats, status) VALUES (?, ?, ?, ?, 'open')`,
      [ename, datetime, cap, cap]
    );

    const eid = eventResult.lastID;

    if (organiser_id) {
      const user = await get(`SELECT * FROM User WHERE id = ?`, [organiser_id]);
      if (user) {
        await run(
          `INSERT INTO organiser (id, eid, ename) VALUES (?, ?, ?)`,
          [user.id, eid, ename]
        );
      }
    }

    const newEvent = await get(`SELECT * FROM Event WHERE eid = ?`, [eid]);
    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- REGISTRATION API ---
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await all(`
      SELECT 
        r.reg_id,
        r.status as reg_status,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        e.eid,
        e.ename,
        e.datetime,
        COALESCE(c.checkin_status, 'pending') as checkin_status
      FROM Registration r
      JOIN User u ON r.id = u.id
      JOIN Event e ON r.eid = e.eid
      LEFT JOIN CheckIn c ON c.reg_id = r.reg_id AND c.eid = e.eid
      ORDER BY r.reg_id DESC
    `);
    res.json({ success: true, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register for Event (Use Case 2)
app.post('/api/registrations', async (req, res) => {
  const { user_id, eid } = req.body;

  if (!user_id || !eid) {
    return res.status(400).json({ success: false, error: 'User ID and Event ID are required' });
  }

  try {
    const event = await get(`SELECT * FROM Event WHERE eid = ?`, [eid]);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Rule: Event capacity cannot be exceeded; once full, registrations must be blocked
    if (event.status !== 'open' || event.seats <= 0) {
      return res.status(400).json({ success: false, error: 'Event capacity exceeded or event is closed. Registrations blocked.' });
    }

    const user = await get(`SELECT * FROM User WHERE id = ?`, [user_id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Rule: A student can register once only. Duplicate registration is not allowed.
    const existing = await get(`SELECT * FROM Registration WHERE id = ? AND eid = ? AND status = 'confirmed'`, [user_id, eid]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Duplicate registration is not allowed. Student is already registered for this event.' });
    }

    // Process Registration
    const regResult = await run(
      `INSERT INTO Registration (id, eid, status) VALUES (?, ?, 'confirmed')`,
      [user_id, eid]
    );
    const reg_id = regResult.lastID;

    // Create Participant record
    await run(
      `INSERT INTO Participants (name, eid, ename, regid, status) VALUES (?, ?, ?, ?, 'registered')`,
      [user.name, eid, event.ename, reg_id]
    );

    // Create CheckIn record
    await run(
      `INSERT INTO CheckIn (reg_id, eid, checkin_status) VALUES (?, ?, 'pending')`,
      [reg_id, eid]
    );

    // Update available seats count & status
    const newSeats = event.seats - 1;
    const newStatus = newSeats === 0 ? 'closed' : 'open';

    await run(
      `UPDATE Event SET seats = ?, status = ? WHERE eid = ?`,
      [newSeats, newStatus, eid]
    );

    const createdReg = await get(`
      SELECT 
        r.reg_id, r.status as reg_status, u.name as user_name, e.ename, e.seats, e.status as event_status
      FROM Registration r
      JOIN User u ON r.id = u.id
      JOIN Event e ON r.eid = e.eid
      WHERE r.reg_id = ?
    `, [reg_id]);

    res.status(201).json({ success: true, data: createdReg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel Registration (Use Case 3)
app.post('/api/registrations/cancel', async (req, res) => {
  const { reg_id } = req.body;

  if (!reg_id) {
    return res.status(400).json({ success: false, error: 'Registration ID is required' });
  }

  try {
    const reg = await get(`SELECT * FROM Registration WHERE reg_id = ?`, [reg_id]);
    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    if (reg.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Registration is already cancelled' });
    }

    // Remove / update registration status
    await run(`UPDATE Registration SET status = 'cancelled' WHERE reg_id = ?`, [reg_id]);
    await run(`UPDATE Participants SET status = 'cancelled' WHERE regid = ?`, [reg_id]);

    // Restore seat capacity for the event
    const event = await get(`SELECT * FROM Event WHERE eid = ?`, [reg.eid]);
    if (event) {
      const restoredSeats = Math.min(event.capacity, event.seats + 1);
      await run(
        `UPDATE Event SET seats = ?, status = 'open' WHERE eid = ?`,
        [restoredSeats, event.eid]
      );
    }

    res.json({ success: true, message: 'Registration cancelled successfully and capacity freed.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CHECK IN API ---
app.get('/api/checkins', async (req, res) => {
  try {
    const checkins = await all(`
      SELECT 
        c.id as checkin_id,
        c.reg_id,
        c.eid,
        c.checkin_status,
        u.id as user_id,
        u.name as participant_name,
        u.email as participant_email,
        e.ename as event_name,
        e.datetime as event_datetime
      FROM CheckIn c
      JOIN Registration r ON c.reg_id = r.reg_id
      JOIN User u ON r.id = u.id
      JOIN Event e ON c.eid = e.eid
      WHERE r.status = 'confirmed'
      ORDER BY c.id DESC
    `);
    res.json({ success: true, data: checkins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check-In to Event (Use Case 4)
app.post('/api/checkins', async (req, res) => {
  const { reg_id, eid } = req.body;

  if (!reg_id || !eid) {
    return res.status(400).json({ success: false, error: 'Registration ID and Event ID are required' });
  }

  try {
    // Only registered students can check in
    const reg = await get(`SELECT * FROM Registration WHERE reg_id = ? AND eid = ? AND status = 'confirmed'`, [reg_id, eid]);
    if (!reg) {
      return res.status(400).json({ success: false, error: 'Student is not registered for this event or registration is cancelled.' });
    }

    const checkin = await get(`SELECT * FROM CheckIn WHERE reg_id = ? AND eid = ?`, [reg_id, eid]);

    // Rule: Check-in is allowed ONLY ONCE
    if (checkin && checkin.checkin_status === 'checked_in') {
      return res.status(400).json({ success: false, error: 'Student has already checked in. Check-in is allowed only once.' });
    }

    if (!checkin) {
      await run(
        `INSERT INTO CheckIn (reg_id, eid, checkin_status) VALUES (?, ?, 'checked_in')`,
        [reg_id, eid]
      );
    } else {
      await run(
        `UPDATE CheckIn SET checkin_status = 'checked_in' WHERE id = ?`,
        [checkin.id]
      );
    }

    // Update Participant status
    await run(`UPDATE Participants SET status = 'checked_in' WHERE regid = ?`, [reg_id]);

    const updatedCheckin = await get(`
      SELECT 
        c.id as checkin_id, c.reg_id, c.eid, c.checkin_status,
        u.name as participant_name, e.ename as event_name
      FROM CheckIn c
      JOIN Registration r ON c.reg_id = r.reg_id
      JOIN User u ON r.id = u.id
      JOIN Event e ON c.eid = e.eid
      WHERE c.reg_id = ? AND c.eid = ?
    `, [reg_id, eid]);

    res.json({ success: true, data: updatedCheckin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- DASHBOARD METRICS API ---
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = await get(`SELECT COUNT(*) as count FROM User`);
    const totalEvents = await get(`SELECT COUNT(*) as count FROM Event`);
    const openEvents = await get(`SELECT COUNT(*) as count FROM Event WHERE status = 'open'`);
    const totalRegistrations = await get(`SELECT COUNT(*) as count FROM Registration`);
    const totalCheckedIn = await get(`SELECT COUNT(*) as count FROM CheckIn WHERE checkin_status = 'checked_in'`);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        totalEvents: totalEvents.count,
        openEvents: openEvents.count,
        totalRegistrations: totalRegistrations.count,
        totalCheckedIn: totalCheckedIn.count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
