"use client";

export default function DisabledStateOverlay() {
  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 flex flex-col justify-center items-center space-y-4">
        <p className="text-white text-md">Connect Wallet to Continue</p>
      </div>
    </div>
  );
}
