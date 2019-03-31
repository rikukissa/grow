import * as React from "react";
import * as Webcam from "react-webcam";
import useSize from "react-use/esm/useSize";
import styled from "@emotion/styled";
import { isMobile } from "is-mobile";

const Container = styled.div`
  position: relative;
`;

const Overlay = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
`;

const constraints = {
  aspectRatio: 1,
  facingMode:
    isMobile() && !document.location.host.startsWith("localhost")
      ? { exact: "environment" }
      : "user"
};

type Props = React.PropsWithChildren<{}>;

export const Camera = React.forwardRef<any, Props>(function(
  props: React.PropsWithChildren<{}>,
  ref
) {
  const [sized] = useSize(({ width }) => {
    console.log(ref);

    return (
      <Container>
        <Webcam
          width={width}
          height={width}
          audio={false}
          style={{ display: "block" }}
          ref={ref}
          screenshotQuality={1}
          videoConstraints={{
            ...constraints
          }}
        />
        <Overlay>{props.children}</Overlay>
      </Container>
    );
  });

  return sized;
});
