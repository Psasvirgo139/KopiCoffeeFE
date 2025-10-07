import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getProfile } from "../../utils/dataProvider/profile";

const initialState = {
  data: {
    user_id: 0,
    display_name: null,
    first_name: null,
    last_name: null,
    address: null,
    birthdate: null,
    img: null,
    created_at: "",
    email: "",
    phone_number: "",
  },
  isLoading: false,
  isRejected: false,
  isFulfilled: false,
  err: null,
};

// ✅ BE mới trả OBJECT thẳng (snake_case) -> dùng res.data
export const getProfileThunk = createAsyncThunk(
  "profile/get",
  async ({ controller, token }, { rejectWithValue }) => {
    try {
      const res = await getProfile(token, controller);
      if (res.status !== 200) {
        return rejectWithValue(res.data?.message || "Failed to fetch profile");
      }
      return res.data; // object: { user_id, username, display_name, email, phone_number, ... }
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || err?.message || "Fetch failed"
      );
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    reset: () => ({
      data: {
        user_id: 0,
        display_name: null,
        first_name: null,
        last_name: null,
        address: null,
        birthdate: null,
        img: null,
        created_at: "",
        email: "",
        phone_number: "",
      },
      isLoading: false,
      isRejected: false,
      isFulfilled: false,
      err: null,
    }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProfileThunk.pending, (state) => {
        state.isLoading = true;
        state.isRejected = false;
        state.isFulfilled = false;
        state.err = null;
      })
      .addCase(getProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isFulfilled = true;
        state.data = action.payload || {};
      })
      .addCase(getProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isRejected = true;
        state.err = action.payload || "Unknown error";
      });
  },
});

export const profileAction = { ...profileSlice.actions, getProfileThunk };
export default profileSlice.reducer;
