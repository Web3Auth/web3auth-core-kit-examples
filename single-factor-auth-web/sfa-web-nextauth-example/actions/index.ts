"use server";

import { signIn, signOut } from "@/auth";
import { web3auth } from "@/lib/web3auth";

export async function handleSignIn() {
  await signIn("google");
}

export async function handleSignOut() {
  await signOut();
  await web3auth.logout();
}
