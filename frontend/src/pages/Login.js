import React from "react";

const Login = () => {
  const backendURL = "http://localhost:5000";

  const handleGoogleLogin = () => {
    window.location.href = `${backendURL}/auth/google`;
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh"
    }}>
      <h1>Sign In</h1>
      <button 
        style={{
          padding: "12px 20px",
          fontSize: "16px",
          cursor: "pointer",
          background: "black",
          color: "white",
          borderRadius: "8px",
          border: "none"
        }}
        onClick={handleGoogleLogin}
      >
        Sign in with Google
      </button>
    </div>
  );
};

export default Login;
