"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { btnCls, inputCls, labelCls } from "@/components/admin/ui";

export default function LoginForm({ devHint }: { devHint: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} autoFocus />
        {devHint && <p className="mt-1 text-xs text-stone-500">Local development password: admin</p>}
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" className={`${btnCls} w-full`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
