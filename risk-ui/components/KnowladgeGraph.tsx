import React from "react";
import ReactForceGraph2d from "react-force-graph-2d";
import type { NodeObject } from "react-force-graph-2d";

type UserNode = NodeObject & {
  label: string;
};

const KnowladgeGraph: React.FC = () => {
  return (
    <ReactForceGraph2d
      width={1153}
      height={500}
      backgroundColor="#101020"
      graphData={{
        nodes: [
          { id: "node1", label: "hoge" },
          { id: "node2", label: "fuga" },
        ] as UserNode[],
        links: [{ source: "node1", target: "node2" }],
      }}
      nodeLabel="label"
    />
  );
};

export default KnowladgeGraph;
