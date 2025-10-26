import React, {
  Component,
  Fragment,
} from 'react';

import { Link } from 'react-router-dom';


// components
import Footer from '../components/Footer';
import Header from '../components/Header';

class Mainpage extends Component {
  state = {

    bgImages: [
      "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/480791536_598007873229142_8654667733752084531_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=b6MtT3hgNAcQ7kNvwGz7-iG&_nc_oc=AdkSoQKisg_BnrBGfa9F2fia3-AIWXuXbBaoDVK76fCovQ6AHhlhMsIIwHbRTHOytvQ&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=6UcfCUbIz9fKbnH9nTmIMQ&oh=00_Afc9Q-hK8rYkWp-cbzhDV-Amr7jIpqx9TRi0FBGGd8vgUQ&oe=69015C71", // coffee
      "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/473621965_556225474083020_6052115158892626931_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=86c6b0&_nc_ohc=PCJcPfbzOAIQ7kNvwGb4-cR&_nc_oc=AdlcPFrNI1KN-lqVGPFg3NG1rqK8LboQIUeUlZ7y9FEQTkRAzcanlK-9qgTF2lo82I8&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=Y3T56BQa6705TpoDX4-VlA&oh=00_AffR0qSwGmWRngTxLLw-IUmEfu_AoowyNbk-tnhBTHFeqw&oe=690183F7", // breakfast
      "https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/469085766_528699346835633_4604862292613346027_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=RWtUSJ-YkOkQ7kNvwEiAKE8&_nc_oc=AdmjuUgbs0s2AsQYJgBt0JaYjqzDZqysgGTi064RDt7va6ywKeOsR9XCM9RcPu9wt7Y&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=zdc0Thinrl3QewUq_LRbLg&oh=00_AfdER46blQ8-vVWQkHYZgOamOQMG6UoDxboGSohGzjyEyg&oe=690170CD", // cafe interior
    ],
    currentBg: 0,

    teamImages: [
  { img: "https://scontent.fsgn2-7.fna.fbcdn.net/v/t39.30808-6/571166920_2009528193198972_8986191140646971264_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=127cfc&_nc_ohc=QZNh7R_Y8ssQ7kNvwFaWNFh&_nc_oc=AdkDZLtO58aWB8tA0XZVMxrKSKvJSv9IP0go3OMLSEKSlFEBAx3LdgWjnWTkdJC2Dog&_nc_zt=23&_nc_ht=scontent.fsgn2-7.fna&_nc_gid=_vDwq8lCXtYoKog7KS4iag&oh=00_AfcY_H-Ht4LUV8zQag0QyREOMSB6_09BOQIR16dItHbxnw&oe=690118A4", name: "Quang Huy"},
  { img: "https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.30808-6/568685239_2009528083198983_3683367515249980103_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=yv0C283G6DkQ7kNvwGu3il8&_nc_oc=Adl6DSxJ1PLTZwfMCWOAq665S2ZrQCRXU59K4_cklASnqS59vURpmiW8wSm5AD6EXy8&_nc_zt=23&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=Ds-IGNEp0CrPiyM74V9uug&oh=00_AfcPUndiTNtsoFxi1WQ5rU6yFkcxf3SdKugDhCSog2OU8A&oe=6900F97B", name: "Ngoc Khoi"},
  { img: "https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.30808-6/571995038_2009528079865650_2757432688694329848_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=lbElhKMT5vkQ7kNvwEpTWKb&_nc_oc=Admp2Ky2VG90Mqo5PBSoI6YmvVkNJxZyltzQzKA9Qgme4N4T9q4Ou5tvjgABaoCYFBA&_nc_zt=23&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=Oos5geW9QYGDjrCescQlcQ&oh=00_Afd-2W3vrDI-kA8lqh7SNnLDuIwVUzTeJCvrJpMakAsE2Q&oe=690126F4", name: "Tien Dat"},
  { img: "https://scontent.fsgn2-4.fna.fbcdn.net/v/t39.30808-6/572263375_2009528076532317_4777371741674840162_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_ohc=2vFSu0t84JoQ7kNvwGNv6ke&_nc_oc=Adlfb80kPizFeon42S8U-8gJBvjRxg_sydkEfKC_xiQiXI-YWgyF3LsWGGy5PxV0Ewg&_nc_zt=23&_nc_ht=scontent.fsgn2-4.fna&_nc_gid=4ulzPCAJOBdMZCoxeUxi8g&oh=00_Affl0EG2mTRz1IMWjqfNjwtk2AsN8WsPwPvk_cxc2Gc3SQ&oe=69010885", name: "Nhat Duy"},
  { img: "https://scontent.fsgn2-6.fna.fbcdn.net/v/t39.30808-6/571799536_2009528196532305_1987734247714763611_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=34d-MMNwCNsQ7kNvwEKdPQ0&_nc_oc=AdmcW0HyZhM4SnRvpD_oAYLfElI_S_ngceQsLAZkAxZjbrRSLxX1KgAXtiV8Z2WSNuA&_nc_zt=23&_nc_ht=scontent.fsgn2-6.fna&_nc_gid=fTLj4xn7DvYEK5AxQTCTyQ&oh=00_Afc_VNmuwzNlMyOB-7nT1-2ZKkJH1M0EbQMN1aTF3Zs3iQ&oe=6901155C", name: "Van Duc"},
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
  className="bg-cover bg-center bg-no-repeat min-h-screen transition-all duration-1000 ease-in-out"
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
        src="https://scontent.fdad3-5.fna.fbcdn.net/v/t39.30808-6/481112476_597986719897924_4997183883181250185_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=127cfc&_nc_ohc=GvHRVB3FXBQQ7kNvwFaWFll&_nc_oc=AdmSCPNlf6DK4i2k-SB8amC9_K1ADp6ExSkeJYlWziB1s24Inj1hkMLR-n1EnxCixcY&_nc_zt=23&_nc_ht=scontent.fdad3-5.fna&_nc_gid=ui9PHMjdWLMOspIX7L4oNQ&oh=00_Affs2RQphjWBSci3YBeqCwyp-FLfSvGnyRzNxSc6vsakFA&oe=69016A7D"
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
          src="https://scontent.fdad3-4.fna.fbcdn.net/v/t39.30808-6/481210328_604195959277000_2146736397082022161_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=127cfc&_nc_ohc=BSh8ie7z-KIQ7kNvwE66ol8&_nc_oc=AdmG5nWQWVvwfhCzQYt_3SU8A_mMu53dH0hD3QwFbZCfoOn_cuFiOWXQzL2aaKiGOuY&_nc_zt=23&_nc_ht=scontent.fdad3-4.fna&_nc_gid=XWjMEum3cN4bz_JUlXV-oQ&oh=00_AfePGS9S1hJoVU_fRym_fkS1jhg-dJvzvRIELBmJ4xwg3Q&oe=690191EE"
          alt="Nước ngon thượng vị"
           className="w-full h-[550px] object-contain rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="absolute bottom-0 left-0 w-full py-6 text-center bg-white group-hover:bg-[#A12B2B] transition-all duration-500">
        <h3 className="font-semibold text-lg tracking-wide text-quartenary group-hover:text-white transition-colors duration-500">
          CÀ PHÊ HẠNH NHÂN
        </h3>
      </div>
    </div>

    {/* Món 2 */}
    <div className="group relative rounded-2xl overflow-hidden shadow-md transition-all duration-500 ease-in-out cursor-pointer w-full md:w-[45vw] max-w-[600px] bg-[#FFF8ED]">
      <div className="overflow-hidden rounded-2xl">
        <img
          src="https://scontent.fdad3-1.fna.fbcdn.net/v/t39.30808-6/490374021_636719132691349_4168899042463776652_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=jZjDm2XEJB4Q7kNvwFPKVwQ&_nc_oc=AdmPjjWDZgtNuZBWX3LXj-uHCSU30Vv20NTYhmKW_DStJ-FHjFgkUphg6i42YJxMDV0&_nc_zt=23&_nc_ht=scontent.fdad3-1.fna&_nc_gid=mP0G5x4cg3tlE8wn8t8sQw&oh=00_AfdDcvpzBdEfEKyR-7fLMsJ3Ea6kviVTEQAPelEtL_b1Pg&oe=690179ED"
          alt="Bánh ngon no đầy"
           className="w-full h-[550px] object-contain rounded-2xl transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="absolute bottom-0 left-0 w-full py-6 text-center bg-white group-hover:bg-[#A12B2B] transition-all duration-500">
        <h3 className="font-semibold text-lg tracking-wide text-quartenary group-hover:text-white transition-colors duration-500">
          CÀ PHÊ CỐT DỪA
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
