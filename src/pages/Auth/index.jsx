import React from 'react';
// 1. Thêm 'Link' vào import
import { Outlet, Link } from 'react-router-dom';
import AuthFooter from '../../components/AuthFooter';

const Auth = () => {
  return (
    <>
      <main className="relative flex flex-col min-h-screen bg-gray-100">
        
        {/* Lớp nền ảnh (background image layer) */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('https://i.pinimg.com/736x/d5/7c/1e/d57c1e61e3d9c4519c271f9a0629e37a.jpg')" }}
        ></div>
        
        {/* Lớp phủ */}
        <div className="absolute inset-0 bg-gray-30 opacity-30"></div>

        {/* Vùng nội dung chính */}
        <div className="relative z-10 flex-grow flex justify-center py-12 px-4 sm:px-6 lg:px-8">
          
          <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-between">
            
            {/* Cột trái (Logo và text) */}
            <section className="text-center lg:text-left lg:w-1/2 p-4 lg:pr-12 mb-8 lg:mb-0">
              
              {/* 2. Bọc h1 bằng Link trỏ về trang chủ '/' */}
              <Link to="/">
                <h1 className="text-6xl font-bold text-red-700" style={{ fontFamily: 'serif' }}>
                  KOPI
                </h1>
              </Link>
              
              <p className="mt-2 text-2xl text-gray-700">
                COFFEE & WORKSPACE
              </p>
              <p className="mt-4 text-xl text-gray-600">
                Connect, work and relax at Kopi.
              </p>
            </section>
            
            {/* Cột phải (Card Đăng nhập) */}
            <section className="lg:w-1/2 w-full flex justify-center">
              <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <Outlet />
              </div>
            </section>
            
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 w-full bg-white py-2 px-4 shadow-inner">
          <AuthFooter />
        </div>
        
      </main>
    </>
  );
};

export default Auth;