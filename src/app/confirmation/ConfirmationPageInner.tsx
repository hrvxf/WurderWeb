"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfirmationPageInner() {
  const searchParams = useSearchParams();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const value = searchParams.get("name");
    setName(value);
  }, [searchParams]);

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold">Confirmation</h1>
      <p className="mt-4 text-lg">
        {name ? `Thank you, ${name}, your form has been received.` : "Missing name."}
      </p>
    </div>
  );
}
