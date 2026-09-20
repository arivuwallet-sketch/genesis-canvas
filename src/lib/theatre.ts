import { getProject, types } from "@theatre/core";

export const theatreProject = getProject("Genesis AI Cinematics");
export const theatreSheet = theatreProject.sheet("Cutscene");

export const CINEMATIC_CAMERA_PROPS = {
  position: {
    x: types.number(0, { range: [-100, 100] }),
    y: types.number(4, { range: [-20, 100] }),
    z: types.number(10, { range: [-100, 100] }),
  },
  lookAt: {
    x: types.number(0, { range: [-100, 100] }),
    y: types.number(1, { range: [-20, 100] }),
    z: types.number(0, { range: [-100, 100] }),
  },
};
