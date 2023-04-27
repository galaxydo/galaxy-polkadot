import { useRef, useEffect } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import GalaxyUI from "./GalaxyUI";

export default function App() {
  const excalidrawRef = useRef(null);

  useEffect(() => {
    console.log('window.excalidraw', excalidrawRef);
    window.excalidraw = excalidrawRef;
  }, [excalidrawRef])

  return (
    <div className="main">
      <Excalidraw
        ref={excalidrawRef}
        zenModeEnabled={true}
        gridModeEnabled={true}
        theme="dark"
      />
      <GalaxyUI excalidrawRef={excalidrawRef} />
    </div>
  );
}
