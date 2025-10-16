"use client"

import { useState, useContext } from "react"
import { AuthContext } from "../../context/AuthContext"
import { ToastContainer } from "react-toastify"

const LoginPage = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await login(username, password)
    setLoading(false)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const containerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #4B5563 0%, #2D3748 100%)", // Gradient dark gray to lighter gray
    padding: "16px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  }

  const cardStyle = {
    background: "rgba(255, 255, 255, 0.9)", // Slightly transparent white
    backdropFilter: "blur(10px)",
    padding: "48px 32px",
    borderRadius: "16px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.2)", // More pronounced shadow
    width: "100%",
    maxWidth: "425px",
    border: "none",
  }

  const headerContainerStyle = {
    textAlign: "center",
    marginBottom: "32px",
  }

  const logoContainerStyle = {
    width: "75px",
    height: "100px",
    background: "transparent",
    borderRadius: "0",
    padding: "0",
    boxShadow: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
  }

  const logoStyle = {
    width: "100%",
    height: "auto",
    objectFit: "contain",
    borderRadius: "50%",
    animation: "flip-and-rotate 2.5s ease-in-out, pulse-shadow 2s infinite alternate",
  }

  const titleStyle = {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937", // Dark gray color for text
    margin: "0 0 8px 0",
    letterSpacing: "-0.025em",
  }

  const subtitleStyle = {
    fontSize: "16px",
    color: "#6b7280", // Lighter gray for subtitle text
    margin: "0",
    fontWeight: "400",
  }

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  }

  const fieldStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  }

  const labelStyle = {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "4px",
  }

  const inputContainerStyle = {
    position: "relative",
    width: "100%",
  }

  const inputStyle = {
    width: "100%",
    height: "48px",
    padding: "12px 16px",
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "#e5e7eb", // Light gray border
    borderRadius: "8px",
    fontSize: "16px",
    backgroundColor: "#ffffff", // White background for input
    transition: "all 0.2s ease-in-out",
    outline: "none",
    boxSizing: "border-box",
  }

  const passwordInputStyle = {
    ...inputStyle,
    paddingRight: "48px",
  }

  const inputFocusStyle = {
    ...inputStyle,
    borderColor: "#6b7280", // Darker gray on focus
    boxShadow: "0 0 0 3px rgba(107, 114, 128, 0.2)", // Subtle shadow with gray tint
  }

  const passwordInputFocusStyle = {
    ...passwordInputStyle,
    borderColor: "#6b7280", // Darker gray on focus
    boxShadow: "0 0 0 3px rgba(107, 114, 128, 0.2)", // Subtle shadow with gray tint
  }

  const eyeButtonStyle = {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280", // Gray color for icon
    transition: "color 0.2s ease-in-out",
    outline: "none",
  }

  const eyeButtonHoverStyle = {
    ...eyeButtonStyle,
    color: "#4b5563", // Darker gray when hovered
  }

  const eyeIconStyle = {
    width: "24px",
    height: "24px",
    transition: "all 0.2s ease-in-out",
  }

  const buttonStyle = {
    width: "100%",
    height: "48px",
    padding: "12px 16px",
    background: loading ? "#d1d5db" : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)", // Gray gradient for button
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: loading ? "not-allowed" : "pointer",
    transition: "all 0.2s ease-in-out",
    boxShadow: loading ? "none" : "0 4px 12px rgba(107, 114, 128, 0.3)", // Subtle shadow with gray tint
  }

  const buttonHoverStyle = {
    ...buttonStyle,
    background: loading ? "#d1d5db" : "linear-gradient(135deg, #4b5563 0%, #374151 100%)", // Darker gray on hover
    boxShadow: loading ? "none" : "0 6px 16px rgba(107, 114, 128, 0.4)", // Darker shadow on hover
  }

  const [buttonIsHovered, setButtonIsHovered] = useState(false);
  const [isEyeHovered, setIsEyeHovered] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)

  const companyLogoUrl = "/logo.png"

  const keyframes = `
    @keyframes flip-and-rotate {
      0% {
        transform: perspective(400px) rotateY(0) rotateZ(0);
      }
      100% {
        transform: perspective(400px) rotateY(360deg) rotateZ(360deg);
      }
    }
    @keyframes pulse-shadow {
      0% {
        box-shadow: 0 4px 25px 5px rgba(56, 189, 248, 0.2);
      }
      100% {
        box-shadow: 0 4px 35px 10px rgba(56, 189, 248, 0.4);
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerContainerStyle}>
            <div style={logoContainerStyle}>
              <img
                src={companyLogoUrl || "/placeholder.svg"}
                alt="Company Logo"
                style={logoStyle}
                onError={(e) => {
                  e.target.style.display = "none"
                  e.target.nextSibling.style.display = "block"
                }}
              />
            </div>
            <h3 style={titleStyle}>CP ARCHITECT & INTERIORS</h3>
            <p style={subtitleStyle}>Sign in to your construction management dashboard</p>
          </div>

          <form onSubmit={handleSubmit} style={formStyle}>
            <div style={fieldStyle}>
              <label htmlFor="username" style={labelStyle}>
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedInput("username")}
                onBlur={() => setFocusedInput(null)}
                style={focusedInput === "username" ? inputFocusStyle : inputStyle}
                placeholder="Enter your username"
                required
              />
            </div>

            <div style={fieldStyle}>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <div style={inputContainerStyle}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  style={focusedInput === "password" ? passwordInputFocusStyle : passwordInputStyle}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  onMouseEnter={() => setIsEyeHovered(true)}
                  onMouseLeave={() => setIsEyeHovered(false)}
                  style={isEyeHovered ? eyeButtonHoverStyle : eyeButtonStyle}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <img
                      src="/show.png"
                      alt="Show password"
                      style={eyeIconStyle}
                    />
                  ) : (
                    <img
                      src="/hide.png"
                      alt="Hide password"
                      style={eyeIconStyle}
                    />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setButtonIsHovered(true)}
              onMouseLeave={() => setButtonIsHovered(false)}
              style={buttonIsHovered && !loading ? buttonHoverStyle : buttonStyle}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{
            fontSize: "14px",
          }}
        />
      </div>
    </>
  )
}

export default LoginPage
