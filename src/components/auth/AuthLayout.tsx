"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AuthContainerProps {
  children: React.ReactNode
  className?: string
}

export function AuthContainer({ children, className }: AuthContainerProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background px-4", className)}>
      {children}
    </div>
  )
}

interface AuthCardProps {
  children: React.ReactNode
  className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-md", className)}>
      {children}
    </div>
  )
}

interface AuthHeaderProps {
  title: string
  description: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
          F
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface AuthFooterProps {
  children: React.ReactNode
  className?: string
}

export function AuthFooter({ children, className }: AuthFooterProps) {
  return (
    <div className={cn("mt-8 text-center", className)}>{children}</div>
  )
}

interface AuthDividerProps {
  label: string
}

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border"></span>
      </div>
      <span className="relative flex justify-center text-xs uppercase tracking-wider text-muted-foreground bg-background px-4">
        {label}
      </span>
    </div>
  )
}

interface AuthGoogleButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

export function AuthGoogleButton({ onClick, loading, disabled }: AuthGoogleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-input rounded-md bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        loading && "opacity-70 cursor-wait"
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="shrink-0"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66v-2.77c-1.16-.78-1.95-1.94-2.21-3.31H12v3.78c-1.02 0-1.92-.23-2.7-.65v1.3z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.36-1.39-.36-2.15 0-.76.14-1.49.36-2.15C5.1 10.65 4 9.15 4 7.5c0-.95.13-1.87.36-2.73C3.58 5.69 2.61 4.75 1.43 4.13v2.77c1.02.07 1.92.34 2.68.87C5.69 8.78 6.94 10.22 7.28 11.5h-1.3c-.78-.66-1.28-1.66-1.28-2.77 0-1.11.5-2.08 1.28-2.73h3.57c-.34 1.28-.55 2.63-.55 4.05 0 1.42.21 2.77.55 4.05h-3.57c-.78.07-1.49.25-2.01.52v-1.3c1.02-.08 1.92-.33 2.67-.83v2.77c-1.18.62-2.15 1.55-2.71 2.62-.55 1.07-.84 2.24-.84 3.48 0 1.24.29 2.41.84 3.47.56 1.07 1.53 1.99 2.71 2.61v-2.77c-.75-.5-1.65-.77-2.67-.83z"
        />
        <path
          fill="#EA4335"
          d="M12 23c.64 0 1.25-.07 1.85-.19v-2.77c-1.07 0-2.04-.32-2.7-.87v-1.3c1.07 0 2.04.32 2.7.87v2.77c-.6.12-1.21.19-1.85.19"
        />
      </svg>
      {loading ? "Signing in..." : "Continue with Google"}
    </button>
  )
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  id: string
}

export function AuthInput({ label, error, id, className, ...props }: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          className
        )}
        aria-invalid={error ? true : false}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface AuthPasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  showPassword: boolean
  toggleShowPassword: () => void
}

export function AuthPasswordInput({
  label,
  error,
  id,
  value,
  onChange,
  showPassword,
  toggleShowPassword,
}: AuthPasswordInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : false}
          aria-describedby={error ? `${id}-error` : undefined}
          {...(showPassword ? { autoComplete: "off" } : { autoComplete: "current-password" })}
        />
        <button
          type="button"
          onClick={toggleShowPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <>
              <span className="sr-only">Hide password</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7z" /></svg>
            </>
          ) : (
            <>
              <span className="sr-only">Show password</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7-1.274 4.057 5.064 7 9.542 7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </>
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface AuthButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: "submit" | "button"
  asChild?: boolean
  onClick?: () => void
}

export function AuthButton({ children, loading, disabled, className, type = "submit", asChild = false, onClick }: AuthButtonProps) {
  const Comp = asChild ? React.Fragment : "button"
  return (
    <Comp
      type={asChild ? undefined : type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-transparent rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : null}
      {children}
    </Comp>
  )
}

interface AuthLinkProps {
  children: React.ReactNode
  href: string
  className?: string
}

export function AuthLink({ children, href, className }: AuthLinkProps) {
  return (
    <a
      href={href}
      className={cn("text-sm text-primary hover:text-primary/90 transition-colors underline-offset-4 hover:underline", className)}
    >
      {children}
    </a>
  )
}

interface AuthOutlineButtonProps {
  children: React.ReactNode
  href: string
  className?: string
}

export function AuthOutlineButton({ children, href, className }: AuthOutlineButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-input rounded-md bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  )
}

export interface AuthFormState {
  email?: string | null
  password?: string | null
  error?: string | null
}
