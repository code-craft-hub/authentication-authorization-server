import { combineReducers } from '@reduxjs/toolkit';
import authReducer from '@features/auth/store/authSlice';
import userReducer from '@features/user/store/userSlice';
import referralReducer from '@features/referral/store/referralSlice';
import adminReducer from '@features/admin/store/adminSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  referral: referralReducer,
  admin: adminReducer,
});

export default rootReducer;