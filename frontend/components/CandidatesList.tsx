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
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  district: string;
  office: string;
};

export default function CandidatesList() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', district: '', office: '' });
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', district: '', office: '' });

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/candidates');
      setCandidates(res.data.data); // Extract the `data` field from the response
    } catch (e) {
      console.error(`Error :: ${e}`);
      setCandidates([]); // Ensure `candidates` is always an array
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/candidates', form);
      setForm({ firstName: '', lastName: '', district: '', office: '' });
      fetchCandidates();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  function handleEditClick(candidate: Candidate) {
    setEditId(candidate.id);
    setEditForm({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      district: candidate.district,
      office: candidate.office
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
      await axios.put(`http://localhost:3001/api/candidates/${editId}`, editForm);
      setEditOpen(false);
      setEditId(null);
      fetchCandidates();
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Add Candidate
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
            label="District"
            value={form.district}
            onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
            required
            size="small"
          />
          <TextField
            label="Office"
            value={form.office}
            onChange={(e) => setForm((f) => ({ ...f, office: e.target.value }))}
            required
            size="small"
          />
          <Button type="submit" variant="contained">
            Add
          </Button>
        </Stack>
      </Box>
      <Typography variant="h6" gutterBottom>
        Candidate List
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
                <TableCell>District</TableCell>
                <TableCell>Office</TableCell>
                <TableCell align="right">Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {candidates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.firstName}</TableCell>
                  <TableCell>{c.lastName}</TableCell>
                  <TableCell>{c.district}</TableCell>
                  <TableCell>{c.office}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditClick(c)} size="small">
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
        <DialogTitle>Edit Candidate</DialogTitle>
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
              label="District"
              value={editForm.district}
              onChange={(e) => setEditForm((f) => ({ ...f, district: e.target.value }))}
              required
              size="small"
            />
            <TextField
              label="Office"
              value={editForm.office}
              onChange={(e) => setEditForm((f) => ({ ...f, office: e.target.value }))}
              required
              size="small"
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
