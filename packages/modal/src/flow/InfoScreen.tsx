export const InfoScreen = () => {
  return (
    <div className="flex flex-col space-y-2 px-4">
      <div className="min-h-32 w-full rounded-md border border-(--lv-control-button-secondary-border) p-2">
        Scan QR Code
      </div>
      <div className="w-full rounded-md border border-border p-2">
        Approve on device
      </div>
      <div className="w-full rounded-md border border-border p-2">
        You're connected!
      </div>
    </div>
  );
};
