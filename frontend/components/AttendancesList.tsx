'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Stack,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

type Event = {
  id: number;
  name: string;
};

type Attendance = {
  id: number;
  eventId: number;
  eventName?: string;
  firstName: string;
  lastName: string;
  email: string;
  interestedInVolunteering: boolean;
  donationAmount?: number;
};

export default function AttendancesList() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({
    eventId: '',
    firstName: '',
    lastName: '',
    email: '',
    interestedInVolunteering: false,
    donationAmount: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendances();
    fetchEvents();
  }, []);

  async function fetchAttendances() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/attendances');
      setAttendances(res.data.map((a: any) => ({
        ...a,
        eventName: a.eventName || undefined
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const res = await axios.get('http://localhost:3001/api/events');
      setEvents(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/attendances', {
        ...form,
        eventId: Number(form.eventId),
        donationAmount: form.donationAmount ? Number(form.donationAmount) : undefined
      });
      setForm({ eventId: '', firstName: '', lastName: '', email: '', interestedInVolunteering: false, donationAmount: '' });
      fetchAttendances();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: number) {
    try {
      await axios.delete(`http://localhost:3001/api/attendances/${id}`);
      fetchAttendances();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Attendance
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        mb={3}
        sx={{
          opacity: events.length === 0 ? 0.5 : 1,
          pointerEvents: events.length === 0 ? 'none' : 'auto',
          background: events.length === 0 ? '#f5f5f5' : undefined,
          borderRadius: 2,
          p: 2,
          position: 'relative',
        }}
      >
        {events.length === 0 && (
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              pointerEvents: 'auto',
              textAlign: 'center',
              width: '100%',
            }}
          >
            No events available
          </Typography>
        )}
        <Stack spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }} required disabled={events.length === 0}>
            <InputLabel id="event-label">Event</InputLabel>
            <Select
              labelId="event-label"
              label="Event"
              value={form.eventId}
              onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))}
              required
            >
              {events.length === 0 ? (
                <MenuItem value="" disabled>
                  No events available
                </MenuItem>
              ) : (
                events.map(ev => (
                  <MenuItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="First Name"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              required
              size="small"
              disabled={events.length === 0}
            />
            <TextField
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              required
              size="small"
              disabled={events.length === 0}
            />
          </Stack>
          <TextField
            type="email"
            label="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            size="small"
            disabled={events.length === 0}
          />
          <TextField
            type="number"
            label="Donation Amount"
            value={form.donationAmount}
            onChange={e => setForm(f => ({ ...f, donationAmount: e.target.value }))}
            size="small"
            disabled={events.length === 0}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={form.interestedInVolunteering}
                onChange={e => setForm(f => ({ ...f, interestedInVolunteering: e.target.checked }))}
                disabled={events.length === 0}
              />
            }
            label="Interested in Volunteering"
          />
          <Button type="submit" variant="contained" disabled={events.length === 0}>
            Add
          </Button>
        </Stack>
      </Box>
      <Typography variant="h6" gutterBottom>
        Attendance List
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event</TableCell>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Interested in Volunteering</TableCell>
                <TableCell>Donation Amount</TableCell>
                <TableCell align="right">Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendances.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{a.eventName || a.eventId}</TableCell>
                  <TableCell>{a.firstName}</TableCell>
                  <TableCell>{a.lastName}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.interestedInVolunteering ? "Yes" : "No"}</TableCell>
                  <TableCell>{a.donationAmount ? `$${a.donationAmount}` : "-"}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleDelete(a.id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
