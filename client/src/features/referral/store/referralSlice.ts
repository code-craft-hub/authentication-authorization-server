
import { createSlice } from '@reduxjs/toolkit';

interface ReferralState {
  // Add referral-specific state here
}

const initialState: ReferralState = {};

const referralSlice = createSlice({
  name: 'referral',
  initialState,
  reducers: {},
});

export default referralSlice.reducer;