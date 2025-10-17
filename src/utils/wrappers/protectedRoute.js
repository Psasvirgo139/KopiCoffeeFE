/* eslint-disable react/prop-types */
import React, { useEffect, useMemo } from "react";

import jwtDecode from "jwt-decode";
import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { profileAction } from "../../redux/slices/profile.slice";
import { uinfoAct } from "../../redux/slices/userInfo.slice";

export const CheckAuth = ({ children }) => {
  const { userInfo } = useSelector((state) => ({
    userInfo: state.userInfo,
  }));

  if (userInfo.token === "" && userInfo.token?.length < 1) {
    toast.error("You must login first");
    return <Navigate to="/auth/login" replace={true} />;
  }
  return <Outlet />;
};

export const CheckNoAuth = ({ children }) => {
  const { userInfo } = useSelector((state) => ({
    userInfo: state.userInfo,
  }));
  if (userInfo.token && userInfo.token?.length > 0) {
    return <Navigate to="/" replace={true} />;
  }
  return children;
};

export const CheckIsAdmin = ({ children }) => {
  const { userInfo, profile } = useSelector((state) => ({
    userInfo: state.userInfo,
    profile: state.profile,
  }));

  // Admin in DB has role_id = 1
  if (userInfo.token === "" || Number(userInfo.role) !== 1) {
    return <Navigate to="/" replace={true} />;
  }
  return <Outlet />;
};

export const TokenHandler = () => {
  const { userInfo, profile } = useSelector((state) => ({
    userInfo: state.userInfo,
    profile: state.profile,
  }));
  const dispatch = useDispatch();
  const controller = useMemo(() => new AbortController(), []);
  const navigate = useNavigate();
  useEffect(() => {
    if (userInfo.token) {
      const decoded = jwtDecode(userInfo.token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        try { localStorage.removeItem("kopi_token"); } catch {}
        dispatch(uinfoAct.dismissToken());
        profileAction.reset();
        toast.error("Your token is expired, please log in back");
      } else {
        // keep axios interceptor token in sync on app load / refresh
        try {
          const existing = localStorage.getItem("kopi_token");
          if (existing !== userInfo.token) {
            localStorage.setItem("kopi_token", userInfo.token);
          }
        } catch {}
      }

      if (profile.isFulfilled) {
        profileAction.getProfileThunk(userInfo.token, controller);
      }
    }
  }, [userInfo.token]);
  return <Outlet />;
};
