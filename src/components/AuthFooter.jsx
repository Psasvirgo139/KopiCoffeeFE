import React from 'react';

import { Link } from 'react-router-dom';

import fbLogo from '../assets/icons/facebook.svg';
import igLogo from '../assets/icons/instagram.svg';
import twLogo from '../assets/icons/twitter.svg';
import logo from '../assets/jokopi.svg';

const AuthFooter = () => {
  return (
    <>
      <footer className="bg-[#F8F8F8] text-[#4f5665]">
        <div className="global-px lg:px-16">
          <div className="py-5  md:py-10"></div>
          <div className="flex flex-col-reverse gap-12 md:flex-row">
            <div className="flex flex-col gap-4 md:max-w-[50%]">
              <Link to="/">
                <div className="font-extrabold flex flex-row gap-2">
                  <img src={logo} alt="logo" width="30px" />{" "}
                  <h1 className="text-xl text-black">Kopi.</h1>
                </div>
              </Link>
              <div className="">
                Kopi is a store that sells some good meals, and especially
                coffee. We provide high quality beans
              </div>
              <div className="flex flex-row gap-5">
                {/* === SỬA ĐỔI 1: Thêm target và link thật === */}
                <a
                  href="https://www.facebook.com/kopi.coffeeworkspace" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-tertiary h-[35px] w-[35px] flex items-center justify-center rounded-full"
                  aria-label="Facebook"
                >
                  <img src={fbLogo} alt="Facebook" />
                </a>
                <a
                  href="https://www.facebook.com/kopi.coffeeworkspace" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-tertiary h-[35px] w-[35px] flex items-center justify-center rounded-full"
                  aria-label="Instagram"
                >
                  <img src={igLogo} alt="Instagram" />
                </a>
                <a
                  href="https://www.facebook.com/kopi.coffeeworkspace" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-tertiary h-[35px] w-[35px] flex items-center justify-center rounded-full"
                  aria-label="Twitter"
                >
                  <img src={twLogo} alt="Twitter" className="w-16" />
                </a>
              </div>
              <div className="copyright">(c) 2025 Kopi</div>
            </div>
            
            {/* === SỬA ĐỔI 2: Xóa target="_blank" khỏi các link bên dưới === */}
            <nav className="flex flex-row lg:flex-col gap-10 md:flex-1">
              <div className="flex-1 flex flex-col gap-5">
                <div className="grid-item">
                  <p className="font-bold">Product</p>
                </div>
                <div className="flex flex-col gap-2  lg:flex-row lg:gap-x-10 lg:gap-y-4 flex-wrap w-full">
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      {" "}
                      Download
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Pricing
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Locations
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Countries
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Blog
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="grid-item">
                  <p className="font-bold">Engage</p>
                </div>
                <div className="flex flex-col gap-2  lg:flex-row lg:gap-x-10 lg:gap-y-4 flex-wrap w-full text-base">
                  <div className="grid-item flex-1 min-w-[5rem]">
                    <a href="#"> 
                      Coffee Shop?
                    </a>
                  </div>
                  <div className="grid-item flex-1 min-w-[5rem]">
                    <a href="#"> 
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      About Us
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Privacy Policy
                    </a>
                  </div>
                  <div className="grid-item flex-1">
                    <a href="#"> 
                      Terms of Services
                    </a>
                  </div>
                </div>
              </div>
            </nav>
          </div>
          <div className="py-5"></div>
        </div>
      </footer>
    </>
  );
};

export default AuthFooter;