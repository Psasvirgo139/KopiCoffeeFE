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
import ScrollToTop from "./utils/scrollToTop";
import ChangePassword from "./pages/Auth/ChangePassword";

import {
  CheckAuth,
  CheckIsAdmin,
  CheckIsEmployee,
  CheckNoAuth,
  TokenHandler,
} from "./utils/wrappers/protectedRoute";
import OrderDrafts from "./pages/Order";
import TableOrder from "./pages/TableOrder";
import ShippingOrder from "./pages/ShippingOrder";
import GuestTableOrder from "./pages/GuestTableOrder";

const Routers = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<TokenHandler />}>
          {/* Public Route */}
          <Route path="*" element={<NotFound />} />
          <Route index element={<Mainpage />} />
          <Route path="products/*" element={<Products title="Products" />}>
            <Route path="category/:id" element={""} />
          </Route>
          <Route
            path="products/detail/:productId"
            element={<ProductDetail />}
          />
          <Route path="cart" element={<Cart />} />
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

          {/* Route must be logged in */}
          <Route element={<CheckAuth />}>
            <Route path="profile" element={<Profile title="User Profile" />} />
            <Route path="history" element={<History />} />
            <Route path="history/:id" element={<HistoryDetail />} />
            {/* Employee only */}
            <Route element={<CheckIsEmployee />}>
              <Route path="draft-order" element={<OrderDrafts />} />
              <Route path="table-order" element={<TableOrder />} />
              <Route path="shipping-order" element={<ShippingOrder />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<CheckIsAdmin />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="customers" element={<Customers />} />
            <Route path="admin/ai-suggest" element={<AiSuggest />} />
            <Route path="products/new" element={<NewProduct />} />
            <Route path="manage-order" element={<ManageOrder />} />
            <Route path="products/edit/:productId" element={<EditProduct />} />
            <Route path="promo" element={<PromoList />} />
            <Route path="promo/new" element={<NewPromo />} />
            <Route path="promo/edit/:promoId" element={<EditPromo />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Routers;
