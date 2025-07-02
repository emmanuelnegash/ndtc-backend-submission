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
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
};

type Event = {
  id: number;
  candidateId: number;
  candidateName?: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  moneyRaised: number;
};

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({ candidateId: '', name: '', date: '', startTime: '', endTime: '', moneyRaised: '' });
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ candidateId: '', name: '', date: '', startTime: '', endTime: '', moneyRaised: '' });

  useEffect(() => {
    fetchEvents();
    fetchCandidates();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/events');
      setEvents(res.data.map((e: any) => ({
        ...e,
        candidateName: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : undefined
      })));
    } catch (e) {
      console.error(`Error :: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCandidates() {
    try {
      const res = await axios.get('http://localhost:3001/api/candidates');
      setCandidates(res.data);
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/events', {
        ...form,
        candidateId: Number(form.candidateId),
        moneyRaised: Number(form.moneyRaised)
      });
      setForm({ candidateId: '', name: '', date: '', startTime: '', endTime: '', moneyRaised: '' });
      fetchEvents();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  function handleEditClick(event: Event) {
    setEditId(event.id);
    setEditForm({
      candidateId: String(event.candidateId),
      name: event.name,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      moneyRaised: String(event.moneyRaised)
    });
    setEditOpen(true);
  }

  function handleEditClose() {
    setEditOpen(false);
    setEditId(null);
  }

  async function handleEditSave() {
    if (editId == null) return;
    try {
      await axios.put(`http://localhost:3001/api/events/${editId}`, {
        ...editForm,
        candidateId: Number(editForm.candidateId),
        moneyRaised: Number(editForm.moneyRaised)
      });
      setEditOpen(false);
      setEditId(null);
      fetchEvents();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Event
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        mb={3}
        sx={{
          opacity: candidates.length === 0 ? 0.5 : 1,
          pointerEvents: candidates.length === 0 ? 'none' : 'auto',
          background: candidates.length === 0 ? '#f5f5f5' : undefined,
          borderRadius: 2,
          p: 2,
          position: 'relative',
        }}
      >
        {candidates.length === 0 && (
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
            No candidates available
          </Typography>
        )}
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: 160 }} required disabled={candidates.length === 0} fullWidth>
              <InputLabel id="candidate-label">Candidate</InputLabel>
              <Select
                labelId="candidate-label"
                label="Candidate"
                value={form.candidateId}
                onChange={e => setForm(f => ({ ...f, candidateId: e.target.value }))}
                required
                fullWidth
              >
                {candidates.length === 0 ? (
                  <MenuItem value="" disabled>
                    No candidates available
                  </MenuItem>
                ) : (
                  candidates.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              label="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              size="small"
              disabled={candidates.length === 0}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="date"
              label="Date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={candidates.length === 0}
              fullWidth
            />
            <TextField
              type="time"
              label="Start Time"
              value={form.startTime}
              onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={candidates.length === 0}
              fullWidth
            />
            <TextField
              type="time"
              label="End Time"
              value={form.endTime}
              onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              required
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={candidates.length === 0}
              fullWidth
            />
          </Stack>
          <TextField
            type="number"
            label="Money Raised"
            value={form.moneyRaised}
            onChange={e => setForm(f => ({ ...f, moneyRaised: e.target.value }))}
            required
            size="small"
            disabled={candidates.length === 0}
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={candidates.length === 0}>
            Add
          </Button>
        </Stack>
      </Box>
      <Typography variant="h6" gutterBottom>
        Event List
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>End Time</TableCell>
                <TableCell>Money Raised</TableCell>
                <TableCell align="right">Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{e.candidateName || e.candidateId}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell>{e.startTime}</TableCell>
                  <TableCell>{e.endTime}</TableCell>
                  <TableCell>${e.moneyRaised}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditClick(e)} size="small">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl size="small" sx={{ minWidth: 160 }} required fullWidth>
                <InputLabel id="edit-candidate-label">Candidate</InputLabel>
                <Select
                  labelId="edit-candidate-label"
                  label="Candidate"
                  value={editForm.candidateId}
                  onChange={e => setEditForm(f => ({ ...f, candidateId: e.target.value }))}
                  required
                  fullWidth
                >
                  {candidates.map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                type="date"
                label="Date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                required
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="time"
                label="Start Time"
                value={editForm.startTime}
                onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                required
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="time"
                label="End Time"
                value={editForm.endTime}
                onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                required
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <TextField
              type="number"
              label="Money Raised"
              value={editForm.moneyRaised}
              onChange={e => setEditForm(f => ({ ...f, moneyRaised: e.target.value }))}
              required
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
