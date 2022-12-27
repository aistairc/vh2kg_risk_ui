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
} from "../utils/sparql";
import type { NextPage } from "next";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Table,
  Box,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  TableContainer,
  Tooltip,
} from "@mui/material";
import { yellow } from "@mui/material/colors";
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
  const [durations, setDurations] = useState<number[]>([]);
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
        console.log("events: ", result);
        setEvents(result);
        setDurations(durations);
      })();
      (async () => {
        const result = await fetchState(activity.activity);
        console.log("state", result);
      })();
    }
  }, [activity]);

  const video = useRef<HTMLVideoElement>(null);
  const onChangeActivity = useCallback(
    (e: SelectChangeEvent<string>) => {
      const a = activities.filter(
        (v) => v.activity.value === e.target.value
      )[0];
      setActivity(a);
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
  const onTimeUpdate = useCallback((e: ChangeEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  }, []);

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
      >
        {videoFile && (
          <>
            <video
              controls
              width="50%"
              ref={video}
              onTimeUpdate={onTimeUpdate}
              src={`/video/${videoFile}`}
            />
            <Box>
              {events ? (
                <TableContainer
                  sx={{
                    height: "414px",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>No.</TableCell>
                        <TableCell>Event URI</TableCell>
                        <TableCell>Action URI</TableCell>
                        <TableCell>Object</TableCell>
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
                          },
                          idx
                        ) => {
                          const onClickButton = () => {
                            if (video.current) {
                              video.current.currentTime =
                                durations[idx - 1] ?? 0;
                            }
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
                                  textAlign: "center",
                                  width: "120px",
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
    </div>
  );
};

export default Home;
