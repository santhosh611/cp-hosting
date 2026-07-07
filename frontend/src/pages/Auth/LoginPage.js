"use client"

import { useState, useContext, useEffect } from "react"
import { AuthContext } from "../../context/AuthContext"
import { ToastContainer } from "react-toastify"

const LoginPage = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useContext(AuthContext)
  const [loading, setLoading] = useState(false)
  const [buttonIsHovered, setButtonIsHovered] = useState(false)
  const [isEyeHovered, setIsEyeHovered] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)

  // Responsive card width based on viewport
  const [cardWidth, setCardWidth] = useState("100%")

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth
      if (vw <= 480) {
        setCardWidth("100%")
      } else if (vw <= 768) {
        setCardWidth("90%")
      } else {
        setCardWidth("420px")
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await login(username, password)
    setLoading(false)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const companyLogoUrl = "/logo.png"

  const keyframes = `
    @keyframes flip-and-rotate {
      0% { transform: perspective(400px) rotateY(0) rotateZ(0); }
      100% { transform: perspective(400px) rotateY(360deg) rotateZ(360deg); }
    }
    @keyframes pulse-shadow {
      0% { box-shadow: 0 4px 25px 5px rgba(56, 189, 248, 0.2); }
      100% { box-shadow: 0 4px 35px 10px rgba(56, 189, 248, 0.4); }
    }
    @keyframes fadeSlideUp {
      0% { opacity: 0; transform: translateY(24px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* Reset body and html to prevent white/gray margin borders and hide scrollbars */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: #1f2937 !important;
      overflow: hidden !important;
      -ms-overflow-style: none !important;  /* IE and Edge */
      scrollbar-width: none !important;  /* Firefox */
    }
    html::-webkit-scrollbar, body::-webkit-scrollbar {
      display: none !important; /* Chrome, Safari, Opera */
    }

    /* Outer full-page wrapper */
    .login-page-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
      background: linear-gradient(135deg, #4B5563 0%, #1f2937 100%);
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      box-sizing: border-box;
      overflow-y: auto;
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    .login-page-wrapper::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }

    /* Card */
    .login-card {
      background: rgba(255, 255, 255, 0.93);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-radius: 20px;
      box-shadow: 0 25px 60px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.25);
      width: 100%;
      max-width: 420px;
      padding: 40px 28px 36px 28px;
      box-sizing: border-box;
      animation: fadeSlideUp 0.5s ease both;
    }

    /* Logo */
    .login-logo-wrap {
      width: 72px;
      height: 72px;
      margin: 0 auto 18px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-logo-wrap img {
      width: 100%;
      height: auto;
      object-fit: contain;
      border-radius: 50%;
      animation: flip-and-rotate 2.5s ease-in-out, pulse-shadow 2s infinite alternate;
    }

    /* Title */
    .login-title {
      font-size: clamp(18px, 5vw, 26px);
      font-weight: 700;
      color: #1f2937;
      text-align: center;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .login-subtitle {
      font-size: clamp(13px, 3.5vw, 15px);
      color: #6b7280;
      text-align: center;
      margin: 0 0 28px 0;
      font-weight: 400;
      line-height: 1.5;
    }

    /* Form */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .login-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .login-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .login-input-wrap {
      position: relative;
      width: 100%;
    }
    .login-input {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 15px;
      background: #fff;
      color: #111827;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
      box-sizing: border-box;
      -webkit-appearance: none;
      appearance: none;
    }
    .login-input:focus {
      border-color: #6b7280;
      box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.18);
    }
    .login-input-password {
      padding-right: 48px;
    }
    .login-eye-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6b7280;
      transition: color 0.2s;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    .login-eye-btn:hover { color: #374151; }
    .login-eye-btn img {
      width: 22px;
      height: 22px;
      pointer-events: none;
    }
    .login-submit-btn {
      width: 100%;
      height: 50px;
      padding: 0 16px;
      background: linear-gradient(135deg, #6b7280 0%, #374151 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
      box-shadow: 0 4px 14px rgba(55,65,81,0.3);
      letter-spacing: 0.02em;
      -webkit-tap-highlight-color: transparent;
    }
    .login-submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #4b5563 0%, #1f2937 100%);
      box-shadow: 0 6px 20px rgba(55,65,81,0.4);
      transform: translateY(-1px);
    }
    .login-submit-btn:active:not(:disabled) {
      transform: translateY(0px);
    }
    .login-submit-btn:disabled {
      background: #d1d5db;
      box-shadow: none;
      cursor: not-allowed;
    }

    /* ---- Small phones (≤360px) ---- */
    @media (max-width: 360px) {
      .login-page-wrapper { padding: 12px; }
      .login-card { padding: 28px 16px 24px 16px; border-radius: 16px; }
      .login-logo-wrap { width: 60px; height: 60px; margin-bottom: 14px; }
      .login-title { font-size: 17px; }
      .login-subtitle { font-size: 12px; margin-bottom: 22px; }
      .login-form { gap: 16px; }
      .login-input { height: 44px; font-size: 14px; }
      .login-submit-btn { height: 46px; font-size: 14px; }
    }

    /* ---- Standard phones (361–480px) – default target ---- */
    @media (min-width: 361px) and (max-width: 480px) {
      .login-page-wrapper { padding: 16px; }
      .login-card { padding: 36px 22px 30px 22px; }
    }

    /* ---- Large phones / small tablets (481–640px) ---- */
    @media (min-width: 481px) and (max-width: 640px) {
      .login-card { max-width: 400px; padding: 40px 28px; }
    }

    /* ---- Tablets (641–1024px) ---- */
    @media (min-width: 641px) and (max-width: 1024px) {
      .login-card { max-width: 420px; padding: 48px 36px; }
      .login-title { font-size: 24px; }
      .login-subtitle { font-size: 14px; }
    }

    /* ---- Desktops (1025px+) ---- */
    @media (min-width: 1025px) {
      .login-card { max-width: 420px; padding: 52px 40px; }
    }
  `

  return (
    <>
      <style>{keyframes}</style>
      <div className="login-page-wrapper">
        <div className="login-card">
          {/* Header */}
          <div className="login-logo-wrap">
            <img
              src={companyLogoUrl || "/placeholder.svg"}
              alt="Company Logo"
              onError={(e) => { e.target.style.display = "none" }}
            />
          </div>
          <h1 className="login-title">CP ARCHITECT &amp; INTERIORS</h1>
          <p className="login-subtitle">Sign in to your construction management dashboard</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Username */}
            <div className="login-field">
              <label htmlFor="username" className="login-label">Username</label>
              <div className="login-input-wrap">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedInput("username")}
                  onBlur={() => setFocusedInput(null)}
                  className="login-input"
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="password" className="login-label">Password</label>
              <div className="login-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  className="login-input login-input-password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="login-eye-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <img src="/show.png" alt="Show password" />
                  ) : (
                    <img src="/hide.png" alt="Hide password" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

      </div>
    </>
  )
}

export default LoginPage
