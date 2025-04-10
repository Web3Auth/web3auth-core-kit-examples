import loader from "./spinner.svg"; // Tell webpack this JS file uses this image

const Loading = () => (
  <div style={{ textAlign: "center" }}>
    <img src={loader} height="200px" alt="Loading" />
  </div>
);

// New BlurredLoading component
const BlurredLoading = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <img src={loader} height="100px" alt="Loading" />
    </div>
  </div>
);

export { Loading, BlurredLoading };
export default Loading;
