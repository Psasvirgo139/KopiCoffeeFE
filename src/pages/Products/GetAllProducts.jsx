/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";

import axios from "axios";
import { useSelector } from "react-redux";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import penIcon from "../../assets/icons/icon-pen.svg";
import emptyBox from "../../assets/images/empty.svg";
import loadingImage from "../../assets/images/loading.svg";
import productPlaceholder from "../../assets/images/placeholder-image.webp";
import { getAllProducts } from "../../utils/dataProvider/products";
import { n_f } from "../../utils/helpers";
import withSearchParams from "../../utils/wrappers/withSearchParams.js";

function GetAllProducts(props) {
  {
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [inputPage, setInputPage] = useState(1);
    const userInfo = useSelector((state) => state.userInfo);
    const { catId } = useParams();
    const { searchParams, setSearchParams } = props;
    const { sort, setSort } = props;

    function getProducts(catId, searchParams, controller) {
      const sort = searchParams.get("sort");
      const orderBy = searchParams.get("orderBy");
      const searchByName = searchParams.get("q");
      setIsLoading(true);

      getAllProducts(
        catId,
        { sort, limit: 8, searchByName, orderBy, page },
        controller
      )
        .then((response) => response.data)
        .then((data) => {
          setProducts(data.data);
          setMeta(data.meta);
          setIsLoading(false);
        })
        .catch((err) => {
          if (axios.isCancel(err)) return;
          setIsLoading(false);
          setProducts([]);
          setMeta({});
        });
    }

    // const controller = React.useMemo(() => new AbortController(), [catId]);
    const page = searchParams.get("page");
    if (searchParams.has("page") && (page < 1 || isNaN(page))) {
      setSearchParams({ page: 1 });
    }

    const paginatorPress = (e) => {
      if (e.key === "Enter") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const page =
          meta.totalPage < e.target.value ? meta.totalPage : e.target.value;
        setSearchParams({ page });
      }
    };

    // const controller = useMemo(
    //   () => new AbortController(),
    //   [catId, page, searchParams]
    // );

    const navigate = useNavigate();
    const location = useLocation();

    const navigateWithParams = (newParams) => {
      const searchParams = new URLSearchParams(location.search);
      Object.entries(newParams).forEach(([key, value]) =>
        searchParams.set(key, value)
      );
      navigate(`${location.pathname}?${searchParams}`);
    };

    const handleNextClick = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigateWithParams({ page: parseInt(meta.currentPage) + 1 });
    };

    const handlePrevClick = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      navigateWithParams({ page: parseInt(meta.currentPage) - 1 });
    };

    useEffect(() => {
      const controller = new AbortController();
      setInputPage(!page ? 1 : page);

      // Fetch new products
      getProducts(catId, searchParams, controller);

      return () => {
        console.log(catId);
        controller.abort();
        setIsLoading(true);
      };
    }, [catId, page, searchParams]);

    if (isLoading)
      return (
        <section className="w-full h-80 flex justify-center items-center">
          <img src={loadingImage} alt="" />
        </section>
      );

    if (products.length < 1) {
      return (
        <section className="w-full flex flex-col justify-center items-center py-8 text-center font-medium gap-5">
          <div>
            <img src={emptyBox} alt="" className="w-52" />
          </div>
          <div>
            <p>
              We&apos;re sorry, it seems our products have gone into hiding.
            </p>
            <p>We&apos;ll try to coax them out soon.</p>
          </div>
        </section>
      );
    }

    return (
      <>
       <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
  {products.map((product) => (
    <div
      key={product.id}
      className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group flex flex-col justify-between"
    >
      {/* Ảnh sản phẩm */}
      <Link to={`/products/detail/${product.id}`}>
        <div className="relative overflow-hidden">
          <img
            src={product.img ?? productPlaceholder}
            alt={product.name}
            className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>

      {/* Nội dung */}
      <div className="p-4 flex flex-col justify-between flex-grow">
        <div>
          <Link to={`/products/detail/${product.id}`}>
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2 h-12 hover:text-orange-500 transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.desc && (
            <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem] mt-1">
              {product.desc}
            </p>
          )}
        </div>

        {/* Giá và nút edit */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xl font-bold text-tertiary">
             {n_f(product.price)} VND
          </span>
          {Number(userInfo.role) === 1 && (
            <NavLink
              to={`/products/edit/${product.id}`}
              className="bg-orange-500 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-orange-600 transition-all duration-200 hover:scale-110 shadow-md"
            >
              <img src={penIcon} className="w-4 h-4" alt="Edit" />
            </NavLink>
          )}
        </div>
      </div>
    </div>
  ))}
</section>

      {/* Pagination */}
      <section className="flex items-center justify-center mt-12 gap-4">
        {/* Previous & Next Buttons */}
        <div className="flex gap-2">
          {meta.prev && (
            <button
              className="group border-2 border-orange-500 bg-white hover:bg-orange-500 text-orange-500 hover:text-white rounded-lg font-bold py-2 px-6 flex items-center gap-2 transition-all duration-200"
              onClick={handlePrevClick}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
          )}

          {meta.next && (
            <button
              className="group bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold py-2 px-6 flex items-center gap-2 hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={handleNextClick}
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Page Info */}
        <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-md border-2 border-gray-100">
          <span className="text-sm text-gray-600">Page</span>
          <input
            type="number"
            name="paginator"
            min="1"
            max={meta.totalPage}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onKeyDown={paginatorPress}
            className="w-12 h-8 border-2 border-orange-200 bg-white rounded-md px-2 text-center font-bold text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <span className="text-sm text-gray-600">of</span>
          <span className="font-bold text-gray-900">{meta.totalPage}</span>
        </div>
      </section>
      </>
    );
  }
}

export default withSearchParams(GetAllProducts);
