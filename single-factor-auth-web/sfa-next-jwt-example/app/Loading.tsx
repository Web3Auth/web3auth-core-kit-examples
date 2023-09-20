import Image from "next/image";

import loader from "./spinner.svg"; // Tell webpack this JS file uses this image

const Loading = () => (
  <div style={{ textAlign: "center" }}>
    <Image src={loader} height="200" alt="Loading" />
  </div>
);

export default Loading;
