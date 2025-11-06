import React, {
  Component,
  Fragment,
} from 'react';

import { Link } from 'react-router-dom';

import ngockhoiImage from '../assets/images/ourteam/ngockhoi.png';
import quanghuyImage from '../assets/images/ourteam/quanghuy.png';
import tiendatImage from '../assets/images/ourteam/tiendat.png';
import vanducImage from '../assets/images/ourteam/vanduc.png';
import nhatduyImage from '../assets/images/ourteam/nhatduy.png';
import bg1Image from '../assets/images/bg1.jpg';
import bg2Image from '../assets/images/bg2.jpg';
import bg3Image from '../assets/images/bg3.jpg';
import almondcoffeeImage from '../assets/products/almondcoffee.jpg';
import coconutcoffeeImage from '../assets/products/coconutcoffee.jpg';
import tiramisucoffeeImage from '../assets/products/tiramisucoffee.jpg';
// components
import Footer from '../components/Footer';
import Header from '../components/Header';

class Mainpage extends Component {
  state = {

    bgImages: [
      bg1Image,
      bg2Image,
      bg3Image,
    ],
    currentBg: 0,

    teamImages: [
  { img: quanghuyImage, name: "Quang Huy"},
  { img: ngockhoiImage, name: "Ngoc Khoi"},
  { img: tiendatImage, name: "Tien Dat"},
  { img: nhatduyImage, name: "Nhat Duy"},
  { img: vanducImage, name: "Van Duc"},
],

};
  

componentDidMount() {
  this.bgInterval = setInterval(() => {
    this.setState((prev) => ({
      currentBg: (prev.currentBg + 1) % prev.bgImages.length,
    }));
  }, 10000);

  const scrollContainer = this.scrollRef;
  this.scrollInterval = setInterval(() => {
    if (!scrollContainer) return;
    scrollContainer.scrollLeft += 1;
    if (
      scrollContainer.scrollLeft + scrollContainer.clientWidth >=
      scrollContainer.scrollWidth
    ) {
      scrollContainer.scrollLeft = 0;
    }
  }, 15);
}

componentWillUnmount() {
  clearInterval(this.interval);
  clearInterval(this.autoScroll);
}
  render() {
    const { bgImages, currentBg } = this.state;
    return (
      <Fragment>
        <Header />
        <main>
          <section
  className="bg-cover bg-center bg-no-repeat h-[80vh] transition-all duration-1000 ease-in-out"
  style={{
    backgroundImage: `url(${bgImages[currentBg]})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "background-image 1.5s ease-in-out",
  }}
></section>
         <section className="bg-white py-20 text-center font-serif text-black">
  <div className="container mx-auto px-6 lg:px-20 grid grid-cols-1 md:grid-cols-3 items-center gap-10">
    {/* Cột trái */}
    <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-3">Rich Espresso Blends</h2>
        <p className="text-gray-600 leading-relaxed text-[15px] max-w-[320px]">
          Indulge in the deep, robust flavors of our expertly crafted espresso
          blends. Perfect for a quick pick-me-up or a leisurely afternoon treat.
        </p>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-3">Classic Drip Coffee</h2>
        <p className="text-gray-600 leading-relaxed text-[15px] max-w-[320px]">
          Enjoy the comforting taste of our classic drip coffee, brewed to
          perfection. A timeless choice for coffee enthusiasts who appreciate
          simplicity.
        </p>
      </div>
    </div>

    {/* Ảnh giữa */}
    <div className="flex justify-center">
      <img
        src= {tiramisucoffeeImage}
        alt="Coffee Cup"
        className="w-64 md:w-72 drop-shadow-2xl rounded-2xl hover:scale-105 transition-transform duration-300"
      />
    </div>

    {/* Cột phải */}
    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-10">
      <div>
        <h2 className="text-3xl font-bold mb-3">Smooth Cold Brews</h2>
        <p className="text-gray-600 leading-relaxed text-[15px] max-w-[320px]">
          Refresh yourself with our smooth and invigorating cold brew options.
          Ideal for warm days when you need a cool, caffeinated boost.
        </p>
      </div>

      <div>
        <h2 className="text-3xl font-bold mb-3">Flavorful Latte Varieties</h2>
        <p className="text-gray-600 leading-relaxed text-[15px] max-w-[320px]">
          Experience the rich and creamy flavors of our diverse latte
          selections. From vanilla to caramel, we have a latte to suit every
          taste.
        </p>
      </div>
    </div>
  </div>
</section>
          <section className="global-px py-8 md:py-20 bg-white">
  <div className="flex flex-col items-center mb-12">
    <h2 className="text-4xl text-quartenary font-semibold mb-5 text-center">
      People’s Favorite
    </h2>
  </div>

  <div className="flex flex-col md:flex-row justify-center items-center gap-10 md:gap-16">
    {/* Món 1 */}
    <div className="group relative rounded-2xl overflow-hidden shadow-md transition-all duration-500 ease-in-out cursor-pointer w-full md:w-[45vw] max-w-[600px] bg-[#FAF7F2]">
      <div className="overflow-hidden rounded-2xl">
        <img
          src={almondcoffeeImage}
          alt="Almond Coffee"
           className="w-full h-[550px] object-contain rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="absolute bottom-0 left-0 w-full py-6 text-center bg-white group-hover:bg-[#A12B2B] transition-all duration-500">
        <h3 className="font-semibold text-lg tracking-wide text-quartenary group-hover:text-white transition-colors duration-500">
          ALMOND COFFEE
        </h3>
      </div>
    </div>

    {/* Món 2 */}
    <div className="group relative rounded-2xl overflow-hidden shadow-md transition-all duration-500 ease-in-out cursor-pointer w-full md:w-[45vw] max-w-[600px] bg-[#FFF8ED]">
      <div className="overflow-hidden rounded-2xl">
        <img
          src={coconutcoffeeImage}
          alt="Coconut Coffee"
           className="w-full h-[550px] object-contain rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="absolute bottom-0 left-0 w-full py-6 text-center bg-white group-hover:bg-[#A12B2B] transition-all duration-500">
        <h3 className="font-semibold text-lg tracking-wide text-quartenary group-hover:text-white transition-colors duration-500">
          COCONUT COFFEE
        </h3>
      </div>
    </div>
  </div>
</section>

          <section className="global-px py-8 md:py-20">
            <div className="flex flex-col items-center mb-8 md:mb-20">
              <h2 className="text-4xl text-quartenary font-semibold mb-5 text-center">
                Visit Our Store in
                <br />
                the Spot on the Map Below
              </h2>
              <p className="text-base text-gray-700 text-center">
                See our store in every city on the spot and spen your good day
                there. See you soon!
              </p>
            </div>
            <div className="mt-10 w-full flex justify-center">
  <iframe
    title="Google Map"
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3873.850379340676!2d108.23518607518173!3d16.06996348460964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314217dca4833e45%3A0x641279138f1ee8e8!2sKopi%20Coffee%20%26%20Workspace!5e1!3m2!1svi!2s!4v1761394829606!5m2!1svi!2s" 
    width="100%"
    height="500"
    style={{ border: 0, borderRadius: "20px" }}
    allowFullScreen=""
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
  ></iframe>
</div>
          </section>
         <section className="global-px py-8 md:py-20 bg-white">
  <div className="flex flex-col items-center mb-8 md:mb-16">
    <h2 className="text-4xl text-quartenary font-semibold mb-10 text-center">
      Our Team
    </h2>
  </div>

  <div
    ref={(ref) => (this.scrollRef = ref)}
    className="overflow-x-auto scrollbar-hide flex flex-nowrap gap-8 px-4 scroll-smooth"
  >
    {this.state.teamImages.map((member, idx) => (
      <div
        key={idx}
        className="flex-shrink-0 w-[260px] text-center bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300"
      >
        <img
          src={member.img}
          alt={member.name}
          className="w-full h-[300px] object-cover rounded-t-2xl"
        />
        <div className="py-4">
          <h3 className="text-lg font-semibold text-quartenary">
            {member.name}
          </h3>
        </div>
      </div>
    ))}
  </div>
</section>
          <section className="global-px z-10 relative w-full mb-6 md:mb-[-6rem]">
  <div className="shadow-primary rounded-xl flex flex-col md:flex-row py-10 md:py-14 px-8 md:px-16 bg-white text-center md:text-left">
    <aside className="flex-1 space-y-4 mb-5 md:mb-0">
      <p className="text-3xl font-semibold">Check our menu today!</p>
      <p className="text-primary">
        Explore our delicious dishes and pick your favorite
      </p>
    </aside>
    <aside className="hidden lg:block lg:flex-1"></aside>
    <aside className="flex-1 flex flex-col justify-center">
      <Link
  to="/products"
  className="ml-auto w-[100%] md:w-[75%] bg-secondary rounded-xl py-4 text-tertiary font-bold hover:opacity-90 transition text-center"
>
  See Menu
</Link>

    </aside>
  </div>
</section>
        </main>
        <Footer />
      </Fragment>
    );
  }
}

export default Mainpage;
