// Futura — shared configuration
const FUTURA_CONFIG = {
  SUPABASE_URL: 'https://oorxjgzhscczvflvjwlk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcnhqZ3poc2NjenZmbHZqd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzI3NDQsImV4cCI6MjA5MDI0ODc0NH0.ak6sk5um7X4dzmEuI8IcBAno7xvsdPiSw5Ebs_SxOek',
  API_BASE_URL: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:8789'
    : `http://${window.location.hostname}:8789`,
  RAZORPAY_KEY_ID: 'rzp_test_SWbI1IwINtkyyB'
};
