import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  const handleControl = (action: "close" | "maximize" | "minimize") => {
    window.api.invoke("window:control", action);
  };

  return (
    <div className="flex h-11.25 w-full items-center bg-white/50 shadow-sm backdrop-blur-md [-webkit-app-region:drag]">
      <span className="ml-3 text-lg">星穹工具箱</span>
      <div className="ml-auto flex h-full [-webkit-app-region:no-drag]">
        <button
          className="flex h-full w-12.5 items-center justify-center transition-colors hover:bg-white/50"
          onClick={() => handleControl("minimize")}
        >
          <Minus size={14} />
        </button>
        <button
          className="flex h-full w-12.5 items-center justify-center transition-colors hover:bg-white/50"
          onClick={() => handleControl("maximize")}
        >
          <Square size={12} />
        </button>
        <button
          className="flex h-full w-12.5 items-center justify-center transition-colors hover:bg-red-400/60"
          onClick={() => handleControl("close")}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
