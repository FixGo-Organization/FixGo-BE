// utils/geocode.js
import axios from "axios";

export const geocodeAddress = async (address) => {
  const apiKey = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
    address
  )}&key=${apiKey}&language=vi&countrycode=vn&limit=1`;

  const res = await axios.get(url);
 ;

  console.log("🔍 Raw OpenCage response:", res.data);
  if (!res.data || !res.data.results || res.data.results.length === 0) {
    throw new Error("Địa chỉ không hợp lệ hoặc không tìm thấy");
  }

  const result = res.data.results[0];
  return {
    formatted_address: result.formatted, 
    input_address: address,
    location: {
      lat: result.geometry.lat,
      lng: result.geometry.lng,
    },
  };
};
