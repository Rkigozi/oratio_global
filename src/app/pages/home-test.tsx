// Simple test component to verify home page renders
export function HomeTest() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(45deg, #ff0000, #00ff00)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "24px",
        fontWeight: "bold",
      }}
    >
      HOME PAGE TEST - IF YOU SEE THIS, THE HOME PAGE RENDERS
    </div>
  );
}