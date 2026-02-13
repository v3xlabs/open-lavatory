const TabletGraphic = ({ isApple }: { isApple: boolean; }) => (
  <div className="flex h-full w-full justify-between">
    <div className="grow py-1 ps-1">
      <div className="h-full rounded-sm border border-gray-300 bg-gray-400"></div>
    </div>
    <div className="flex h-full w-3 flex-col items-center justify-center gap-0.5 pr-0.5">
      {Array.from({ length: isApple ? 1 : 3 }).map((_, index) => (
        <div
          className="h-1.5 w-1.5 rounded-full border border-gray-500"
          key={"dot-t-" + index}
        >
        </div>
      ))}
    </div>
  </div>
);

const PhoneGraphic = ({ isApple }: { isApple: boolean; }) => (
  <div className="flex h-full w-full flex-col justify-between">
    <div className="grow px-1 pt-1">
      <div className="h-full rounded-sm border border-gray-200 bg-gray-300"></div>
    </div>
    <div className="flex h-3 w-full items-center justify-center gap-0.5 pb-0.5">
      {Array.from({ length: isApple ? 1 : 3 }).map((_, index) => (
        <div
          className="h-1.5 w-1.5 rounded-full border border-gray-400"
          key={"dot-p-" + index}
        >
        </div>
      ))}
    </div>
  </div>
);

export const ConnectionGraphic = () => {
  // the only fingerprinting we ever do
  // is Apple device
  //   const isApple =
  //     navigator.userAgent.includes("iPhone") ||
  //     navigator.userAgent.includes("iPad") ||
  //     navigator.userAgent.includes("iPod");
  const isApple = true;

  return (
    <div className="-space-x-4 flex items-end">
      <div className="h-38 w-48 overflow-hidden rounded-lg bg-gray-300">
        <TabletGraphic isApple={isApple} />
      </div>
      <div className="h-18 w-12 overflow-hidden rounded-lg bg-gray-200">
        <PhoneGraphic isApple={isApple} />
      </div>
    </div>
  );
};
