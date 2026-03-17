import React from "react";
import { Composition } from "remotion";
import { SFProjectReel } from "./SFProjectReel";
import { ProjectConfig, FPS, WIDTH, HEIGHT } from "./config/types";
import exampleConfig from "./config/example-project.json";

export const RemotionRoot: React.FC = () => {
  const defaultDuration = 30 * FPS;

  return (
    <>
      <Composition
        id="SFProjectReel"
        component={SFProjectReel as unknown as React.FC<Record<string, unknown>>}
        durationInFrames={defaultDuration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          config: exampleConfig as ProjectConfig,
          totalDurationInFrames: defaultDuration,
          voiceoverPath: undefined,
        }}
      />
    </>
  );
};
