'use client';
import { Box, Typography, Paper, Button, Snackbar } from '@mui/material';
import { useState } from 'react';
import axios from 'axios';

export default function AdminPage() {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarError, setSnackbarError] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleClearDatabase = async () => {
    try {
      await axios.post('http://localhost:3001/api/admin/clear');
      setSnackbarMessage('Database cleared!');
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarError(true);
    }
  };

  const handleGenerateData = async () => {
    try {
      await axios.post('http://localhost:3001/api/admin/generate');
      setSnackbarMessage('Random data generated!');
      setSnackbarOpen(true);
    } catch (e) {
      setSnackbarError(true);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Paper elevation={4} sx={{ p: 6, maxWidth: 480 }}>
        <Typography variant="h4" gutterBottom align="center">
          Admin Panel
        </Typography>
        <Typography align="center" color="text.secondary" mb={3}>
          You've found the "secret" admin page. <br />
          Click the button below to clear the database or generate random data.
        </Typography>
        <Button variant="contained" color="error" fullWidth onClick={handleClearDatabase} sx={{ mb: 2 }}>
          Clear Database
        </Button>
        <Button variant="contained" color="primary" fullWidth onClick={handleGenerateData} sx={{ mb: 2 }}>
          Generate Random Data
        </Button>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
          message={snackbarMessage}
        />
        <Snackbar
          open={snackbarError}
          autoHideDuration={3000}
          onClose={() => setSnackbarError(false)}
          message="Operation failed."
          color="error"
        />
      </Paper>
    </Box>
  );
} 