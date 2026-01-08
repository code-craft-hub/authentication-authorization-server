import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { AdminUserFilters } from '@types';

interface AdminState {
  filters: AdminUserFilters;
}

const initialState: AdminState = {
  filters: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<AdminUserFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

export const { setFilters, resetFilters } = adminSlice.actions;
export default adminSlice.reducer;