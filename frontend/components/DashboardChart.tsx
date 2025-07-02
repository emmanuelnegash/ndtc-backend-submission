'use client';
import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Box, FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, OutlinedInput, Chip, Typography, CircularProgress, Paper } from '@mui/material';

const METRICS = [
  { key: 'attendance', label: 'Attendance', color: '#0070f3' },
  { key: 'donations', label: 'Donations ($)', color: '#f39c12' },
  { key: 'volunteerSignups', label: 'Volunteer Signups', color: '#27ae60' },
];

export default function DashboardChart() {
  const donationsChartRef = useRef<HTMLCanvasElement>(null);
  const volunteersChartRef = useRef<HTMLCanvasElement>(null);
  const eventDonationsChartRef = useRef<HTMLCanvasElement>(null);

  const [candidates, setCandidates] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [candidateEvents, setCandidateEvents] = useState<any[]>([]);
  const [eventDonations, setEventDonations] = useState<any[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (candidates.length > 0 && selectedCandidateIds.length === 0) {
      setSelectedCandidateIds(candidates.map(c => c.id));
    }
  }, [candidates]);

  useEffect(() => {
    if (selectedCandidateIds.length > 0) {
      fetchMetrics(selectedCandidateIds);
    } else {
      setMetrics(null);
    }
  }, [selectedCandidateIds]);

  useEffect(() => {
    if (candidates.length > 0 && selectedCandidate == null) {
      setSelectedCandidate(candidates[0].id);
    }
  }, [candidates, selectedCandidate]);

  async function fetchCandidates() {
    try {
      const res = await fetch('http://localhost:3001/api/candidates');
      const data = await res.json();
      setCandidates(data);
    } catch (e) {
      console.error(`Error :: ${e}`);
    }
  }

  async function fetchMetrics(candidateIds: number[]) {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/admin/dashboard-metrics?candidateIds=${candidateIds.join(',')}`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(`Error :: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedCandidate) {
      fetch(`http://localhost:3001/api/events?candidateId=${selectedCandidate}`)
        .then(res => res.json())
        .then(events => {
          setCandidateEvents(events);
          Promise.all(events.map((ev: any) =>
            fetch(`http://localhost:3001/api/attendances`).then(res => res.json()).then(attendances => {
              const total = attendances.filter((a: any) => a.eventId === ev.id).reduce((sum: number, a: any) => sum + (a.donationAmount || 0), 0);
              return { eventName: ev.name, total };
            })
          )).then(setEventDonations);
        });
    } else {
      setCandidateEvents([]);
      setEventDonations([]);
    }
  }, [selectedCandidate]);

  useEffect(() => {
    if (!donationsChartRef.current || !metrics) return;
    let chart: Chart | null = null;
    const ctx = donationsChartRef.current.getContext('2d');
    if (!ctx) return;
    const donationsDatasets = metrics.chartData.datasets.filter((d: any) => d.metric === 'donations');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: metrics.chartData.labels,
        datasets: donationsDatasets.map((d: any) => ({ ...d, label: d.label.replace('Donations: ', ''), fill: false }))
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { title: { display: true, text: 'Donations' } },
          x: { title: { display: true, text: 'Date' } }
        }
      }
    });
    return () => { if (chart) chart.destroy(); };
  }, [metrics]);

  useEffect(() => {
    if (!volunteersChartRef.current || !metrics) return;
    let chart: Chart | null = null;
    const ctx = volunteersChartRef.current.getContext('2d');
    if (!ctx) return;
    const volunteerDatasets = metrics.chartData.datasets.filter((d: any) => d.metric === 'volunteerSignups');
    const data = candidates.map(c => {
      const ds = volunteerDatasets.find((d: any) => d.label.includes(c.firstName));
      return ds ? ds.data.reduce((sum: number, v: number) => sum + v, 0) : 0;
    });
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: candidates.map(c => `${c.firstName} ${c.lastName}`),
        datasets: [{
          label: 'Volunteers',
          data,
          backgroundColor: '#27ae60'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Volunteers' } },
          x: { title: { display: true, text: 'Candidate' } }
        }
      }
    });
    return () => { if (chart) chart.destroy(); };
  }, [metrics, candidates]);

  useEffect(() => {
    if (!eventDonationsChartRef.current || !eventDonations.length) return;
    let chart: Chart | null = null;
    const ctx = eventDonationsChartRef.current.getContext('2d');
    if (!ctx) return;
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: eventDonations.map((e: any) => e.eventName),
        datasets: [{
          label: 'Donations',
          data: eventDonations.map((e: any) => e.total),
          backgroundColor: '#f39c12'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { title: { display: true, text: 'Donations' } },
          x: { title: { display: true, text: 'Event' } }
        }
      }
    });
    return () => { if (chart) chart.destroy(); };
  }, [eventDonations]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Donations Over Time</Typography>
        <FormControl sx={{ minWidth: 300, mb: 2 }}>
          <InputLabel id="candidate-multi-label">Candidates</InputLabel>
          <Select
            labelId="candidate-multi-label"
            multiple
            value={selectedCandidateIds}
            onChange={e => setSelectedCandidateIds(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value)}
            input={<OutlinedInput label="Candidates" />}
            renderValue={selected => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((id: number) => {
                  const c = candidates.find(c => c.id === id);
                  return c ? <Chip key={id} label={`${c.firstName} ${c.lastName}`} /> : null;
                })}
              </Box>
            )}
          >
            {candidates.map(c => (
              <MenuItem key={c.id} value={c.id}>
                <Checkbox checked={selectedCandidateIds.indexOf(c.id) > -1} />
                <ListItemText primary={`${c.firstName} ${c.lastName}`} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {loading && <CircularProgress />}
        {!loading && metrics && <canvas ref={donationsChartRef} height={200} />}
      </Paper>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Volunteers Per Candidate</Typography>
        {!loading && metrics && <canvas ref={volunteersChartRef} height={200} />}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Event Donations</Typography>
        <FormControl sx={{ minWidth: 220, mb: 2 }}>
          <InputLabel id="candidate-select-label">Candidate</InputLabel>
          <Select
            labelId="candidate-select-label"
            value={selectedCandidate ?? ''}
            onChange={e => setSelectedCandidate(Number(e.target.value))}
            input={<OutlinedInput label="Candidate" />}
          >
            {candidates.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {eventDonations.length > 0 && <canvas ref={eventDonationsChartRef} height={200} />}
        {selectedCandidate && eventDonations.length === 0 && <Typography>No events for this candidate.</Typography>}
      </Paper>
    </Box>
  );
}
