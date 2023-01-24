import {
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  SelectChangeEvent,
} from "@mui/material";
import {
  fetchActivity,
  ActivityQueryType,
  fetchEvent,
  PREFIXES,
  EventQueryType,
  fetchState,
  StateObject,
} from "../utils/sparql";
import type { NextPage } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Box,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  TableContainer,
} from "@mui/material";
import { yellow } from "@mui/material/colors";
import { ObjectTable } from "../components/ObjectTable";
import dynamic from "next/dynamic";

const Graph = dynamic(() => import("../components/KnowladgeGraph"), {
  ssr: false,
  loading: () => {
    return <>loading...</>;
  },
});

const Home: NextPage = () => {
  useEffect(() => {
    (async () => {
      const data = await fetchActivity();
      setActivities(data);
    })();
  }, []);

  const [activities, setActivities] = useState<ActivityQueryType[]>([]);
  const [activity, setActivity] = useState<ActivityQueryType | undefined>();

  const [events, setEvents] = useState<EventQueryType[]>([]);
  const [states, setStates] = useState<{ [key: string]: StateObject[] }>({});
  const [durations, setDurations] = useState<number[]>([]);

  const [mode, setShowMode] = useState<"table" | "graph">("table");

  const targets = useMemo(() => {
    const ts = events
      .filter((e) => e.mainObject)
      .flatMap((e) => {
        const values: string[] = [];
        if (e.mainObject) {
          values.push(e.mainObject.value.replace(PREFIXES.ex, "ex:"));
        }
        if (e.targetObject) {
          values.push(e.targetObject.value.replace(PREFIXES.ex, "ex:"));
        }
        return values;
      });
    return ts;
  }, [events]);
  useEffect(() => {
    if (activity) {
      (async () => {
        const result = await fetchEvent(activity.activity);
        result.sort((a, b) => {
          return Number(a.number.value) > Number(b.number.value) ? 1 : -1;
        });
        const ds = result.map((v) => {
          return Number(v.duration.value) / 1.2686;
        });

        const durations: number[] = [];
        let before = 0;
        for (const d of ds) {
          const value = d + before;
          durations.push(value);
          before = value;
        }
        setEvents(result);
        setDurations(durations);
      })();
      (async () => {
        const result = await fetchState(activity.activity);
        setStates(result);
      })();
    }
  }, [activity]);

  const video = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const onPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const onPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const onChangeActivity = useCallback(
    (e: SelectChangeEvent<string>) => {
      const a = activities.filter(
        (v) => v.activity.value === e.target.value
      )[0];

      setActivity(a);
      setIsPlaying(false);
      setCurrentTime(0);
      setStates({});
      setEvents([]);
      setDurations([]);
    },
    [activities]
  );
  const videoFile = useMemo(() => {
    if (!activity) {
      return null;
    }
    return activity.label.value.replaceAll(" ", "_") + "1.mp4";
  }, [activity]);

  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => {
    if (video.current && !isPlaying) {
      video.current.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  const [videoDuration, setVideoDuration] = useState(0);
  const onLoadVideo: React.ReactEventHandler<HTMLVideoElement> = useCallback(
    (e) => {
      setVideoDuration(e.currentTarget.duration);
    },
    []
  );

  const updateCurrent = useCallback(() => {
    if (video.current) {
      if (isPlaying) {
        setCurrentTime(video.current.currentTime);
      }
    }
  }, [isPlaying]);

  const seekingUpdate: React.ReactEventHandler<HTMLVideoElement> = useCallback(
    (e) => {
      if (isPlaying) {
        setCurrentTime(e.currentTarget.currentTime);
      }
    },
    [isPlaying]
  );

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(updateCurrent, 1 / 30);
      return () => {
        clearInterval(timer);
      };
    }
    return () => {};
  }, [isPlaying, updateCurrent]);

  const onClickTable = useCallback(() => {
    setShowMode("table");
  }, []);

  const onClickKGraph = useCallback(() => {
    setShowMode("graph");
  }, []);

  const eventNode = useMemo(() => {
    const ct = Math.round(currentTime * 100) / 100;
    for (let i = 0; i < durations.length; i++) {
      if (
        ct >= Math.round((durations[i - 1] ?? 0) * 100) / 100 &&
        ct < Math.round(durations[i] * 100) / 100
      ) {
        return events[i].event;
      }
    }
    return null;
  }, [currentTime, durations, events]);

  return (
    <div>
      <FormControl fullWidth>
        <InputLabel id="demo-simple-select-label">Videoを選択</InputLabel>
        <Select
          onChange={onChangeActivity}
          value={activity?.activity.value ?? ""}
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          label="Videoを選択"
        >
          {activities.map(({ activity, label }, idx) => {
            return (
              <MenuItem key={idx} value={activity.value}>
                {label.value}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
      <Box
        sx={{
          display: "flex",
          gap: "16px",
        }}
        marginTop="16px"
        height="300px"
      >
        {videoFile && (
          <>
            <video
              controls
              style={{
                flex: 1,
              }}
              ref={video}
              onPlay={onPlay}
              onPause={onPause}
              onLoadedData={onLoadVideo}
              onSeeking={seekingUpdate}
              src={`/video/${videoFile}`}
            />
            <Box flex="2">
              {events ? (
                <TableContainer
                  sx={{
                    height: "100%",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>No.</TableCell>
                        <TableCell>Event URI</TableCell>
                        <TableCell>Action URI</TableCell>
                        <TableCell>Main object</TableCell>
                        <TableCell>Target object</TableCell>
                        <TableCell>Duration</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {events.map(
                        (
                          {
                            event,
                            number,
                            action,
                            mainObject,
                            mainObjectLabel,
                            targetObject,
                            targetObjectLabel,
                          },
                          idx
                        ) => {
                          const onClickButton = () => {
                            setCurrentTime(durations[idx - 1] ?? 0);
                          };
                          const ct = Math.round(currentTime * 100) / 100;
                          const test =
                            ct >=
                              Math.round((durations[idx - 1] ?? 0) * 100) /
                                100 &&
                            ct < Math.round(durations[idx] * 100) / 100;
                          return (
                            <TableRow
                              key={idx}
                              sx={{
                                backgroundColor: test ? yellow[300] : undefined,
                              }}
                            >
                              <TableCell>{Number(number.value) + 1} </TableCell>
                              <TableCell>
                                {event.value.replace(PREFIXES.ex, "ex:")}
                              </TableCell>
                              <TableCell>
                                {action.value.replace(PREFIXES.vh2kg, "vh2kg:")}
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: "0",
                                }}
                              >
                                {mainObjectLabel?.value ??
                                  mainObject?.value.replace(PREFIXES.ex, "ex:")}
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: "0",
                                }}
                              >
                                {targetObjectLabel?.value ??
                                  targetObject?.value.replace(
                                    PREFIXES.ex,
                                    "ex:"
                                  )}
                              </TableCell>
                              <TableCell
                                sx={{
                                  padding: "0",
                                  textAlign: "center",
                                }}
                              >
                                <Button
                                  sx={{
                                    padding: "0",
                                  }}
                                  onClick={onClickButton}
                                >
                                  {`${
                                    durations[idx - 1]
                                      ? Math.round(durations[idx - 1] * 100) /
                                        100
                                      : 0
                                  } ~ ${
                                    Math.round(durations[idx] * 100) / 100
                                  }`}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
            </Box>
          </>
        )}
      </Box>
      {videoFile && (
        <Box>
          <Button onClick={onClickTable}>オブジェクト一覧表示</Button>
          <Button onClick={onClickKGraph}>ナレッジグラフ表示</Button>
        </Box>
      )}
      {mode === "table" ? (
        <ObjectTable
          data={states}
          durations={durations}
          currentTime={currentTime}
          videoDuration={videoDuration}
          onChangeCurrentTime={setCurrentTime}
          targets={targets}
        />
      ) : (
        <Graph eventNode={eventNode} />
      )}
    </div>
  );
};

export default Home;
