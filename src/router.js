import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AdminDashboard from "./pages/Admin";
import AiSuggest from "./pages/Admin/AiSuggest";
import ManageOrder from "./pages/Admin/ManageOrder";
import Auth from "./pages/Auth";
import ForgotPass from "./pages/Auth/ForgotPass";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ResetPass from "./pages/Auth/ResetPass";
import Cart from "./pages/Cart";
import NotFound from "./pages/Error";
import History from "./pages/History";
import HistoryDetail from "./pages/History/HistoryDetail";
import Mainpage from "./pages/Mainpage";
import NotificationPage from "./pages/Notifications";
import Products from "./pages/Products";
import EditProduct from "./pages/Products/EditProduct";
import NewProduct from "./pages/Products/NewProduct";
import ProductDetail from "./pages/Products/ProductDetail";
import Profile from "./pages/Profile";
import EditPromo from "./pages/Promo/EditPromo";
import NewPromo from "./pages/Promo/NewPromo";
import PromoList from "./pages/Promo";
import Employees from "./pages/Employees";
import Customers from "./pages/Customers";
import Schedules from "./pages/Schedules";
import RecurrencePatterns from "./pages/Schedules/RecurrencePatterns";
import AllShifts from "./pages/Schedules/AllShifts";
import WeeklyTimetable from "./pages/Schedules/WeeklyTimetable";
import NewShift from "./pages/Schedules/NewShift";
import EditShift from "./pages/Schedules/EditShift";
import EmployeeAssignment from "./pages/Schedules/EmployeeAssignment";
import GenerateFromPattern from "./pages/Schedules/GenerateFromPattern";
import StaffSchedule from "./pages/Staff/StaffSchedule";
import ScrollToTop from "./utils/scrollToTop";
import ChangePassword from "./pages/Auth/ChangePassword";

import {
  CheckAuth,
  CheckIsAdmin,
  CheckIsEmployee,
  CheckIsStaff,
  CheckNoAuth,
  TokenHandler,
  BlockShipperOnTableOrder,
} from "./utils/wrappers/protectedRoute";
import OrderDrafts from "./pages/Order";
import TableOrder from "./pages/TableOrder";
import ShippingOrder from "./pages/ShippingOrder";
import ShippingTrack from "./pages/ShippingTrack";
import GuestTableOrder from "./pages/GuestTableOrder";
import ThankYou from "./pages/ThankYou";

const Routers = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<TokenHandler />}>
          {/* Public Route */}
          <Route path="*" element={<NotFound />} />
          <Route index element={<Mainpage />} />
          <Route path="guest/table/:qrToken" element={<GuestTableOrder />} />
          <Route path="products/*" element={<Products title="Products" />}>
            <Route path="category/:id" element={""} />
          </Route>
          <Route
            path="products/detail/:productId"
            element={<ProductDetail />}
          />
          {/* Cart requires login - moved under CheckAuth below */}
          {/* Public change-password to avoid being blocked by CheckNoAuth */}
          <Route path="auth/change-password" element={<ChangePassword />} />

          {/* Route must NOT be logged in */}
          <Route
            path="auth"
            element={
              <CheckNoAuth>
                <Auth />
              </CheckNoAuth>
            }
          >
            <Route index element={<Login />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgotpass" element={<ForgotPass />} />
            <Route path="resetpass" element={<ResetPass />} />
            {/* removed duplicate change-password route */}
          </Route>

          {/* Public thank-you page (after payment redirect) */}
          <Route path="thank-you" element={<ThankYou />} />
          
          {/* Route must be logged in */}
          <Route element={<CheckAuth />}>
            <Route path="cart" element={<Cart />} />
            <Route path="profile" element={<Profile title="User Profile" />} />
            <Route path="history" element={<History />} />
            <Route path="history/:id" element={<HistoryDetail />} />
            <Route path="shipping/:orderId" element={<ShippingTrack />} />
            <Route path="notifications" element={<NotificationPage />} />
            {/* Employee only */}
            <Route element={<CheckIsEmployee />}>
              <Route path="staff/schedules" element={<StaffSchedule />} />
              <Route path="draft-order" element={<OrderDrafts />} />
              <Route element={<BlockShipperOnTableOrder />}>
                <Route path="table-order" element={<TableOrder />} />
              </Route>
              <Route path="shipping-order" element={<ShippingOrder />} />
            </Route>
            {/* Staff (Admin or Employee) */}
            <Route element={<CheckIsStaff />}>
              <Route path="manage-order" element={<ManageOrder />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<CheckIsAdmin />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="customers" element={<Customers />} />
            <Route path="admin/ai-suggest" element={<AiSuggest />} />
            <Route path="products/new" element={<NewProduct />} />
            <Route path="products/edit/:productId" element={<EditProduct />} />
            <Route path="promo" element={<PromoList />} />
            <Route path="promo/new" element={<NewPromo />} />
            <Route path="promo/edit/event/:promoId" element={<EditPromo />} />
            <Route path="promo/edit/code/:promoId" element={<EditPromo />} />
            <Route path="schedules" element={<Schedules />} />
            <Route path="admin/schedules" element={<Schedules />} />
            <Route path="admin/schedules/new" element={<NewShift />} />
            <Route
              path="admin/schedules/:shiftId/edit"
              element={<EditShift />}
            />
            <Route path="admin/shifts/:shiftId/edit" element={<EditShift />} />
            <Route
              path="admin/schedules/:shiftId/employees"
              element={<EmployeeAssignment />}
            />
            <Route
              path="admin/recurrence-patterns"
              element={<RecurrencePatterns />}
            />
            <Route
              path="admin/schedules/generate"
              element={<GenerateFromPattern />}
            />
            <Route path="admin/shifts" element={<AllShifts />} />
            <Route path="admin/timetable" element={<WeeklyTimetable />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Routers;
