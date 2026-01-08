import { createSlice } from '@reduxjs/toolkit';

interface UserState {
  // Add user-specific state here
}

const initialState: UserState = {};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
});

export default userSlice.reducer;