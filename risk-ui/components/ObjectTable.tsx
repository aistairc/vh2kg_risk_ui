import React, { useMemo } from "react";
import { isEqurlState, StateObject } from "../utils/sparql";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";

export const ObjectTable: React.FC<{
  data: { [key: string]: StateObject[] };
  situationNumber: number;
}> = ({ data, situationNumber }) => {
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
  console.log(rows);
  return (
    <TableContainer sx={{ maxHeight: 440 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>No.</TableCell>
            <TableCell>object URI</TableCell>
            <TableCell>state</TableCell>
            <TableCell>facing object URI</TableCell>
            <TableCell>inside object URI</TableCell>
            <TableCell>on object URI</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((val, index) => {
            const { object, state, facing, inside, on } = val[situationNumber];
            return (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{object}</TableCell>
                <TableCell>{Array.from(state).join("\n")}</TableCell>
                <TableCell>{Array.from(facing).join("\n")}</TableCell>
                <TableCell>{Array.from(inside).join("\n")}</TableCell>
                <TableCell>{Array.from(on).join("\n")}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
