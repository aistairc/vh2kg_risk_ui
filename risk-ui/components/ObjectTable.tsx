import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  calcDiffScore,
  DiffScoreType,
  isEqurlState,
  StateItemType,
  StateObject,
} from "../utils/sparql";
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
  Select,
  MenuItem,
  OutlinedInput,
  InputLabel,
  FormControl,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import { yellow } from "@mui/material/colors";

import type { SelectChangeEvent } from "@mui/material";

import { Theme } from "@mui/system";

const Mark: React.FC<{ children: React.ReactNode; active: boolean }> = ({
  children,
  active,
}) => {
  return (
    <Typography
      fontSize="14px"
      color={active ? "red" : undefined}
      fontWeight={active ? "700" : undefined}
    >
      {children}
    </Typography>
  );
};

const filterItems = [
  "キャラクター",
  "ターゲット",
  "変化のあるオブジェクト",
  "全てのオブジェクト",
];

const diffScoreToColor = (score: number) => {
  if (score >= 4) {
    return yellow[700];
  }
  if (score >= 3) {
    return yellow[500];
  }
  if (score >= 2) {
    return yellow[300];
  }
  if (score >= 1) {
    return yellow[100];
  }
};

const DefaultShowItem = {
  state: true,
  close: true,
  inside: true,
  on: true,
  facing: true,
  between: true,
  holdsLh: true,
  holdsRh: true,
};

const FalseShowItem = {
  state: false,
  close: false,
  inside: false,
  on: false,
  facing: false,
  between: false,
  holdsLh: false,
  holdsRh: false,
};

export const ObjectTable: React.FC<{
  data: { [key: string]: StateObject[] };
  durations: number[];
  currentTime: number;
  videoDuration: number;
  targets: string[];
  onChangeCurrentTime: (currentTime: number) => void;
}> = ({
  data,
  durations,
  currentTime,
  videoDuration,
  onChangeCurrentTime,
  targets,
}) => {
  const [filterValues, setFilterValues] = useState<string[]>([filterItems[2]]);

  const situationNumber = useMemo(() => {
    for (let i = durations.length - 1; i >= 0; i--) {
      if (currentTime >= durations[i]) {
        return i + 1;
      }
    }
    return 0;
  }, [currentTime, durations]);

  const [showItems, setShowItems] = useState<StateItemType>(DefaultShowItem);
  const [searchText, setSearchText] = useState<string[]>([]);

  useEffect(() => {
    if (Object.values(data).length === 0) {
      setShowItems(DefaultShowItem);
      setFilterValues([filterItems[2]]);
      setSearchText([]);
    }
  }, [data]);

  const _rows = useMemo(() => {
    const rows = Object.values(data);
    if (!rows.length) {
      return [];
    }

    // 全てのオブジェクトを表示
    if (filterValues.includes(filterItems[3])) {
      return rows;
    }
    const showCharacer = filterValues.includes(filterItems[0]);
    const showTarget = filterValues.includes(filterItems[1]);
    const showDiffer = filterValues.includes(filterItems[2]);

    return rows.filter((situations) => {
      if (showCharacer) {
        if (situations[0].object === "ex:character1_scene1") {
          return true;
        }
      }
      if (showTarget) {
        if (targets.includes(situations[0].object)) {
          return true;
        }
      }
      if (showDiffer) {
        for (let i = 0; i < situations.length - 1; i++) {
          if (!isEqurlState(situations[i], situations[i + 1], showItems)) {
            return true;
          }
        }
      }
      return false;
    });
  }, [data, filterValues, showItems, targets]);

  const filteredRows = useMemo(() => {
    if (!searchText.length) {
      return _rows;
    }
    return _rows.filter((situations) => {
      for (const word of searchText) {
        if (!situations[0].object.includes(word)) {
          return false;
        }
      }
      return true;
    });
  }, [_rows, searchText]);

  const diffScore: { [key: string]: DiffScoreType } = useMemo(() => {
    const result = Object.entries(data).reduce<{
      [key: string]: DiffScoreType;
    }>((prev, [key, sequence]) => {
      prev[key] = calcDiffScore(sequence);
      return prev;
    }, {});
    return result;
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

  // ラベルの位置が被りそうな場合にラベルの位置を縦方向にずらしたい。
  // maxMarginはずらした場合にSliderの高さを調整する必要がある。
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

  const onChangeSlider = useCallback(
    (_: Event, val: number | number[]) => {
      onChangeCurrentTime(val as number);
    },
    [onChangeCurrentTime]
  );

  const onChangeFilter = useCallback((e: SelectChangeEvent<string[]>) => {
    setFilterValues(e.target.value as string[]);
  }, []);
  const onChangeShowItem = useCallback((e: SelectChangeEvent<string[]>) => {
    const values = e.target.value as string[];

    const items = values.reduce<StateItemType>((prev, val) => {
      prev[val as keyof StateItemType] = true;
      return prev;
    }, {} as StateItemType);

    setShowItems({ ...FalseShowItem, ...items });
  }, []);

  const onChangeSearchText = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value.split(" ").filter((w) => w.length));
    },
    []
  );

  if (!durations.length) {
    return null;
  }
  if (!Object.values(data).length) {
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
        onChange={onChangeSlider}
      />
      <FormControl sx={{ m: 1, width: 300 }}>
        <InputLabel id="show-item-select-label">表示する項目</InputLabel>
        <Select
          value={Object.entries(showItems)
            .filter(([_key, val]) => val)
            .map(([key]) => key)}
          labelId="show-item-select-label"
          id="show-item-select"
          input={<OutlinedInput label="表示する項目" />}
          onChange={onChangeShowItem}
          multiple
        >
          {Object.keys(showItems).map((name) => {
            return (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, width: 300 }}>
        <InputLabel id="filter-select-label">表示するオブジェクト</InputLabel>
        <Select
          value={filterValues}
          labelId="filter-select-label"
          id="filter-select"
          input={<OutlinedInput label="表示するオブジェクト" />}
          onChange={onChangeFilter}
          multiple
        >
          {filterItems.map((name, idx) => {
            return (
              <MenuItem key={idx} value={name}>
                {name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1 }}>
        <InputLabel htmlFor="outlined-search">Search</InputLabel>
        <OutlinedInput
          id="outlined-search"
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          }
          label="Search"
          onChange={onChangeSearchText}
        />
      </FormControl>
      <TableContainer sx={{ width: "100%" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>オブジェクトURI</TableCell>
              {showItems.state && <TableCell>state</TableCell>}
              {showItems.close && <TableCell>close</TableCell>}
              {showItems.facing && <TableCell>facing</TableCell>}
              {showItems.inside && <TableCell>inside</TableCell>}
              {showItems.on && <TableCell>on</TableCell>}
              {showItems.between && <TableCell>between</TableCell>}
              {showItems.holdsLh && <TableCell>holds lh</TableCell>}
              {showItems.holdsRh && <TableCell>holds rh</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((val, index) => {
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
              const score = diffScore[object];
              return (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{object}</TableCell>
                  {showItems.state && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.state),
                      }}
                    >
                      {Array.from(state).join("\n")}
                    </TableCell>
                  )}
                  {showItems.close && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.close),
                      }}
                    >
                      {Array.from(close).join("\n")}
                    </TableCell>
                  )}
                  {showItems.facing && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.facing),
                      }}
                    >
                      {Array.from(facing).join("\n")}
                    </TableCell>
                  )}
                  {showItems.inside && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.inside),
                      }}
                    >
                      {Array.from(inside).join("\n")}
                    </TableCell>
                  )}
                  {showItems.on && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.on),
                      }}
                    >
                      {Array.from(on).join("\n")}
                    </TableCell>
                  )}
                  {showItems.between && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.between),
                      }}
                    >
                      {Array.from(between).join("\n")}
                    </TableCell>
                  )}

                  {showItems.holdsLh && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.holdsLh),
                      }}
                    >
                      {Array.from(holdsLh).join("\n")}
                    </TableCell>
                  )}
                  {showItems.holdsRh && (
                    <TableCell
                      sx={{
                        backgroundColor: diffScoreToColor(score.holdsRh),
                      }}
                    >
                      {Array.from(holdsRh).join("\n")}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
