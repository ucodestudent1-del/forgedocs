if (typeof window !== "undefined") {
  const stored = localStorage.getItem("theme") as "light" | "dark" | "system" | null
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  
  let shouldBeDark = false
  if (stored === "dark") shouldBeDark = true
  else if (stored === "light") shouldBeDark = false
  else if (stored === "system" || stored === null) shouldBeDark = prefersDark
  
  document.documentElement.classList.toggle("dark", shouldBeDark)
}