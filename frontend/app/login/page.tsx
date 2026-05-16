"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="content">
      <form
        className="panel stack"
        onSubmit={(event) => {
          event.preventDefault();
          void login(username, password);
        }}
      >
        <h1>Sign in</h1>
        <label className="stack">
          Username
          <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="stack">
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="button" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}

