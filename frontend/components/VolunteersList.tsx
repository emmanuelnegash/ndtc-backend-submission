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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

type Volunteer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  candidateId?: number;
};

export default function VolunteersList() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [candidates, setCandidates] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: '', candidateId: '' });
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', role: '', candidateId: '' });

  useEffect(() => {
    fetchVolunteers();
    fetchCandidates();
  }, []);

  async function fetchVolunteers() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/volunteers');
      setVolunteers(res.data);
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
      await axios.post('http://localhost:3001/api/volunteers', {
        ...form,
        candidateId: form.candidateId ? Number(form.candidateId) : undefined
      });
      setForm({ firstName: '', lastName: '', email: '', role: '', candidateId: '' });
      fetchVolunteers();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  function handleEditClick(volunteer: Volunteer) {
    setEditId(volunteer.id);
    setEditForm({
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      email: volunteer.email,
      role: volunteer.role,
      candidateId: volunteer.candidateId ? String(volunteer.candidateId) : ''
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
      await axios.put(`http://localhost:3001/api/volunteers/${editId}`, {
        ...editForm,
        candidateId: editForm.candidateId ? Number(editForm.candidateId) : undefined
      });
      setEditOpen(false);
      setEditId(null);
      fetchVolunteers();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Volunteer
      </Typography>
      <Box component="form" onSubmit={handleSubmit} mb={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="First Name"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            required
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Candidate</InputLabel>
            <Select
              label="Candidate"
              value={form.candidateId}
              onChange={(e) => setForm((f) => ({ ...f, candidateId: e.target.value }))}
              displayEmpty
            >
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button type="submit" variant="contained">
            Add
          </Button>
        </Stack>
      </Box>
      <Typography variant="h6" gutterBottom>
        Volunteer List
      </Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Candidate ID</TableCell>
                <TableCell align="right">Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {volunteers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.firstName}</TableCell>
                  <TableCell>{v.lastName}</TableCell>
                  <TableCell>{v.email}</TableCell>
                  <TableCell>{v.role}</TableCell>
                  <TableCell>{v.candidateId || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditClick(v)} size="small">
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
        <DialogTitle>Edit Volunteer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name"
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                required
                size="small"
              />
              <TextField
                label="Last Name"
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                required
                size="small"
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              required
              size="small"
            />
            <TextField
              label="Role"
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              required
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Candidate</InputLabel>
              <Select
                label="Candidate"
                value={editForm.candidateId}
                onChange={(e) => setEditForm((f) => ({ ...f, candidateId: e.target.value }))}
                displayEmpty
              >
                {candidates.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
