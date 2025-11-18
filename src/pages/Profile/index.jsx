import React, { useEffect, useMemo, useState } from "react";

import { isEqual } from "lodash";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

import iconPen from "../../assets/icons/icon-pen.svg";
import loadingImage from "../../assets/images/loading.svg";
import placeholderImage from "../../assets/images/placeholder-profile.jpg";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import { profileAction } from "../../redux/slices/profile.slice";
import { editProfile, listAddresses, createAddress, setDefaultAddress } from "../../utils/dataProvider/profile";
import useDocumentTitle from "../../utils/documentTitle";
import EditPassword from "./EditPassword";
import MapAddressModal from "../Cart/MapAddressModal";

function Profile() {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.userInfo);
  const profileState = useSelector((state) => state.profile);

  const [data, setData] = useState({
    user_id: "",
    email: "",
    phone_number: "",
    display_name: "",
    address: "",
    created_at: "",
    img: "",
  });
  const [form, setForm] = useState({
    user_id: "",
    email: "",
    phone_number: "",
    display_name: "",
    address: "",
    created_at: "",
    img: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [editPassModal, setEditPassModal] = useState(false);
  const [isProcess, setProcess] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedUserAddressId, setSelectedUserAddressId] = useState(null);
  const [newProfileAddressText, setNewProfileAddressText] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);

  const controller = useMemo(() => new AbortController(), []);
  useDocumentTitle("Profile");

  useEffect(() => {
    if (!userInfo?.token) return;
    dispatch(profileAction.getProfileThunk({ token: userInfo.token, controller }));
    // fetch addresses for dropdown
    listAddresses(userInfo.token, controller)
      .then((res) => {
        const data = res.data?.data || [];
        setAddresses(data);
        const def = data.find((a) => a.is_default);
        if (def) setSelectedUserAddressId(def.user_address_id);
      })
      .catch(() => setAddresses([]));
  }, [dispatch, userInfo?.token, controller]);

  useEffect(() => {
    const server = profileState?.data || {};
    const updated = { ...server };
    for (const [k, v] of Object.entries(updated)) {
      if (v === null || v === "null") updated[k] = "";
    }
    const normalized = {
      user_id: updated.user_id ?? "",
      email: updated.email ?? "",
      phone_number: updated.phone_number ?? "",
      display_name: updated.display_name ?? updated.full_name ?? "",
      address: updated.address ?? "",
      created_at: updated.created_at ?? "",
      img: updated.img ?? "",
    };
    setData(normalized);
    setForm(normalized);
  }, [profileState?.data]);

  const formHandler = (e) => {
    if (!editMode) return;
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const Loading = () => (
    <main className="h-[80vh] flex items-center justify-center">
      <div>
        <img src={loadingImage} alt="Loading..." />
      </div>
    </main>
  );

  const switchEpassModal = () => setEditPassModal((v) => !v);
  const closeEpassModal = () => setEditPassModal(false);

  const saveHandler = () => {
    let hasChange = false;
    const payload = {};
    ["email", "phone_number", "display_name"].forEach((k) => {
      if (form[k] !== data[k]) {
        payload[k] = form[k];
        hasChange = true;
      }
    });
    if (!hasChange) return;

    setProcess(true);
    toast.promise(
      editProfile(payload, userInfo.token, controller)
        .then(() => {
          dispatch(profileAction.getProfileThunk({ token: userInfo.token, controller }));
        })
        .finally(() => setProcess(false)),
      {
        loading: "Saving changes",
        success: "Changes saved",
        error: "Something went wrong",
      }
    );
  };

  const ActionList = () => (
    <div className="flex flex-col items-center">
      <p className="text-tertiary text-xl mb-4 text-center font-bold">
        Do you want to save the change?
      </p>
      <button
        className="bg-tertiary border-2 secondary py-4 w-[75%] rounded-2xl mb-3 text-white font-semibold text-xl shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400"
        id="saveChange"
        onClick={saveHandler}
        disabled={isEqual(form, data) || isProcess}
      >
        Save Change
      </button>
      <button
        className="bg-secondary border-2 secondary py-4 w-[75%] rounded-2xl mb-3 text-tertiary font-semibold text-xl shadow-lg disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white"
        onClick={() => setForm({ ...data })}
        disabled={isEqual(form, data) || isProcess}
      >
        Cancel
      </button>
    </div>
  );

  const isLoading = profileState?.isLoading;

  return (
    <>
      <Header />
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <EditPassword isOpen={editPassModal} onClose={closeEpassModal} />
          <main className="bg-profile">
            <div className="global-px py-10 space-y-3">
              <section className="text-white text-2xl font-extrabold">
                User Profile
              </section>

              <section className="flex flex-col lg:flex-row bg-white rounded-2xl">
                {/* Left column */}
                <section className="flex-1 flex flex-col items-center p-10">
                  <img
                    src={data.img ? data.img : placeholderImage}
                    alt=""
                    className="w-44 aspect-square object-cover rounded-full mb-3"
                  />
                  <p className="font-semibold text-lg">{form.display_name || "User"}</p>
                  <p className="mb-8">{form.email}</p>

                  <button
                    className="bg-white border-2 secondary py-4 w-[75%] rounded-2xl mb-8 text-tertiary font-semibold shadow-lg"
                    onClick={switchEpassModal}
                  >
                    Edit Password
                  </button>

                  <section className="hidden lg:block">
                    <ActionList />
                  </section>
                </section>

                {/* Right column */}
                <section className="flex-[2_2_0%] p-4 md:p-10 lg:pl-0">
                  <form className="bg-white drop-shadow-2xl rounded-xl border-b-[6px] border-solid border-[#6a4029] px-5 py-3 relative">
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {editMode && (
                        <button
                          className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
                          onClick={(e) => {
                            e.preventDefault();
                            setShowMapModal(true);
                          }}
                        >
                          Use Map
                        </button>
                      )}
                      <button
                        className={`${editMode ? "bg-secondary" : "bg-tertiary"} p-2 rounded-full cursor-pointer select-none`}
                        onClick={(e) => {
                          e.preventDefault();
                          setForm(data);
                          setEditMode((v) => !v);
                        }}
                      >
                        <img src={iconPen} alt="" />
                      </button>
                    </div>

                    <p className="text-primary text-xl font-bold">Contacts</p>
                    <div className="grid lg:grid-cols-[55%_35%] gap-x-5 gap-y-8 py-5">
                      <div className="flex flex-col">
                        <label htmlFor="email" className="text-[#9f9f9f]">
                          Email Address
                        </label>
                        <input
                          type="text"
                          id="email"
                          name="email"
                          value={form.email}
                          className="focus:outline-none border-b-[1px] border-black w-full"
                          onChange={formHandler}
                          disabled={!editMode}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="phone" className="text-[#9f9f9f]">
                          Mobile number
                        </label>
                        <input
                          type="text"
                          value={form.phone_number}
                          id="phone"
                          name="phone_number"
                          onChange={formHandler}
                          className="focus:outline-none border-b-[1px] border-black w-full"
                          disabled={!editMode}
                        />
                      </div>

                      <div className="flex flex-col lg:col-span-2">
                        <label htmlFor="address" className="text-[#9f9f9f]">
                          Delivery Address
                        </label>
                        <div className="flex gap-2 items-center">
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={selectedUserAddressId || "__new__"}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setSelectedUserAddressId("__new__");
                                setNewProfileAddressText("");
                                return;
                              }
                              const uaid = Number(val);
                              setSelectedUserAddressId(uaid);
                          // Selecting an address should not toggle Save/Cancel state
                            }}
                          >
                            {editMode && <option value="__new__">New address...</option>}
                            {addresses.map((a) => (
                              <option key={a.user_address_id} value={a.user_address_id}>
                                {a.is_default ? "(Default) " : ""}{a.address_line}
                              </option>
                            ))}
                          </select>
                          {editMode && selectedUserAddressId === "__new__" && (
                            <div className="w-full mt-2">
                              <input
                                type="text"
                                className="border rounded px-2 py-1 text-sm w-full"
                                placeholder="Type new address and press Enter"
                                value={newProfileAddressText}
                                onChange={(e) => setNewProfileAddressText(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    const text = (newProfileAddressText || "").trim();
                                    if (!text) return;
                                    try {
                                      const resp = await createAddress(userInfo.token, { address_line: text, set_default: (addresses.length === 0) }, controller);
                                      const uaid = resp.data?.user_address_id;
                                      const res2 = await listAddresses(userInfo.token, controller);
                                      const data2 = res2.data?.data || [];
                                      setAddresses(data2);
                                      setSelectedUserAddressId(uaid || null);
                                      toast.success("Address added");
                                    } catch {
                                      toast.error("Failed to add address");
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                        {editMode && selectedUserAddressId && selectedUserAddressId !== "__new__" && (
                          <div className="flex gap-2 mt-2">
                            {(() => {
                              const found = addresses.find((a) => a.user_address_id === selectedUserAddressId);
                              const isDefault = !!found?.is_default;
                              return (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary text-white disabled:opacity-50"
                                  disabled={isDefault}
                                  onClick={async () => {
                                    try {
                                      await setDefaultAddress(userInfo.token, selectedUserAddressId, controller);
                                      toast.success("Default address updated");
                                      const res2 = await listAddresses(userInfo.token, controller);
                                      const data2 = res2.data?.data || [];
                                      setAddresses(data2);
                                    } catch {
                                      toast.error("Failed to set default");
                                    }
                                  }}
                                >
                                  Set default
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-primary text-xl font-bold">Details</p>
                    <div className="grid lg:grid-cols-1 gap-y-8 py-5">
                      <div className="input-profile">
                        <label htmlFor="display_name" className="text-[#9f9f9f]">
                          Display name
                        </label>
                        <input
                          type="text"
                          value={form.display_name}
                          id="display_name"
                          name="display_name"
                          onChange={formHandler}
                          className="focus:outline-none border-b-[1px] border-black w-full"
                          disabled={!editMode}
                        />
                      </div>
                    </div>
                  </form>
                </section>

                <section className="block lg:hidden mt-8">
                  <ActionList />
                </section>
              </section>
            </div>
          </main>
        </>
      )}
      <Footer />
      <MapAddressModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        onPick={async (picked) => {
          try {
            const resp = await createAddress(
              userInfo.token,
              {
                address_line: picked.address || "",
                ward: picked.ward || "",
                district: picked.district || "",
                city: picked.city || "",
                latitude: picked.lat,
                longitude: picked.lng,
                set_default: (addresses.length === 0),
              },
              controller
            );
            const newId = resp.data?.user_address_id || resp.data?.address_id || null;
            const res2 = await listAddresses(userInfo.token, controller);
            const data2 = res2.data?.data || [];
            setAddresses(data2);
            if (newId) setSelectedUserAddressId(newId);
            toast.success("Address saved from map");
          } catch {
            toast.error("Failed to save address, please try again");
          }
        }}
      />
    </>
  );
}

export default Profile;
