import type { Metadata } from "next";
import { CreateLeagueForm } from "../_components/CreateLeagueForm";

export const metadata: Metadata = { title: "Create League — Project Grail" };

export default function CreateLeaguePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Create a League</h1>
        <p className="mt-1 text-sm text-zinc-500">
          You&apos;ll be the Commissioner and can manage settings and members.
        </p>
      </div>
      <CreateLeagueForm />
    </div>
  );
}
