import React, { useCallback, useMemo, useState } from "react";
import { isEqurlState, StateObject } from "../utils/sparql";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Slider,
  SxProps,
  Typography,
  CircularProgress,
  Grid,
} from "@mui/material";
import { Theme } from "@mui/system";

const Mark: React.FC<{ children: React.ReactNode; active: boolean }> = ({
  children,
  active,
}) => {
  return (
    <Typography fontSize="14px" color={active ? "red" : undefined}>
      {children}
    </Typography>
  );
};
export const useObjectTable = (
  data: { [key: string]: StateObject[] },
  durations: number[],
  currentTime: number,
  videoDuration: number,
  onChangeCurrentTime: (currentTime: number) => void
) => {
  const situationNumber = useMemo(() => {
    for (let i = durations.length - 1; i >= 0; i--) {
      if (currentTime >= durations[i]) {
        return i + 1;
      }
    }
    return 0;
  }, [currentTime, durations]);

  const rows = useMemo(() => {
    const rows = Object.values(data);
    return rows.filter((situations) => {
      for (let i = 0; i < situations.length - 1; i++) {
        if (!isEqurlState(situations[i], situations[i + 1])) {
          return true;
        }
      }
      return false;
    });
  }, [data]);

  const marks: { label: React.ReactNode; value: number }[] = useMemo(() => {
    const values = durations.map((val, idx) => {
      return {
        label: (
          <Mark active={situationNumber === idx + 1}>{`Situation${
            idx + 1
          }`}</Mark>
        ),
        value: val,
      };
    });
    return [
      {
        label: <Mark active={situationNumber === 0}>Situation0</Mark>,
        value: 0,
      },
      ...values,
    ];
  }, [durations, situationNumber]);

  // ラベルが被りそうな場合位置を縦にずらしたい
  const [zurasu, maxMargin]: [{ [key: string]: SxProps<Theme> }, number] =
    useMemo(() => {
      const values: number[] = [];
      let before = 0;
      const attributes: { [key: string]: SxProps<Theme> } = {};
      let count = 1;
      let maxMargin = 0;
      for (const d of durations) {
        // もし、前回との値の差が全体の6%未満だったら
        if ((d - before) / videoDuration < 0.06) {
          const numberOfMargin = (values[values.length - 1] ?? 0) + 1;
          values.push(numberOfMargin);
          attributes[`.MuiSlider-markLabel[data-index="${count}"]`] = {
            marginTop: `${numberOfMargin * 12}px`,
            marginLeft: `${numberOfMargin * 4}px`,
          };
          maxMargin = Math.max(maxMargin, numberOfMargin * 12);
        } else {
          values.push(0);
        }
        before = d;
        count += 1;
      }
      return [attributes, maxMargin + 20];
    }, [durations, videoDuration]);

  const onChange = useCallback(
    (_: Event, val: number | number[]) => {
      onChangeCurrentTime(val as number);
    },
    [onChangeCurrentTime]
  );

  const component = useMemo(() => {
    if (!durations.length) {
      return null;
    }
    if (!rows.length) {
      return (
        <Grid
          height="200px"
          container
          alignItems="center"
          justifyContent="center"
        >
          <CircularProgress />
        </Grid>
      );
    }
    return (
      <>
        <Slider
          defaultValue={0}
          min={0}
          max={videoDuration}
          marks={marks}
          step={null}
          sx={{
            marginBottom: `${maxMargin}px`,
            ...{
              ".MuiSlider-markLabel": {
                lineHeight: 1,
              },
            },
            ...zurasu,
          }}
          value={currentTime}
          onChange={onChange}
        />
        <TableContainer sx={{ width: "100%" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No.</TableCell>
                <TableCell>オブジェクトURI</TableCell>
                <TableCell>状態</TableCell>
                <TableCell>close</TableCell>
                <TableCell>facing</TableCell>
                <TableCell>inside</TableCell>
                <TableCell>on</TableCell>
                <TableCell>between</TableCell>
                <TableCell>holds lh</TableCell>
                <TableCell>holds rh</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((val, index) => {
                const {
                  object,
                  state,
                  facing,
                  inside,
                  close,
                  on,
                  between,
                  holdsLh,
                  holdsRh,
                } = val[situationNumber];
                return (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{object}</TableCell>
                    <TableCell>{Array.from(state).join("\n")}</TableCell>
                    <TableCell>{Array.from(close).join("\n")}</TableCell>
                    <TableCell>{Array.from(facing).join("\n")}</TableCell>
                    <TableCell>{Array.from(inside).join("\n")}</TableCell>
                    <TableCell>{Array.from(on).join("\n")}</TableCell>
                    <TableCell>{Array.from(between).join("\n")}</TableCell>
                    <TableCell>{Array.from(holdsLh).join("\n")}</TableCell>
                    <TableCell>{Array.from(holdsRh).join("\n")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  }, [
    currentTime,
    durations.length,
    marks,
    maxMargin,
    onChange,
    rows,
    situationNumber,
    videoDuration,
    zurasu,
  ]);
  return {
    component,
  };
};
