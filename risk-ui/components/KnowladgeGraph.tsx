import React from "react";
import ReactForceGraph2d from "react-force-graph-2d";
import type {
  NodeObject,
  LinkObject,
  ForceGraphProps,
} from "react-force-graph-2d";

type NodeType = NodeObject & {
  label: string;
  color: string;
  group: number;
  __bckgDimensions?: number[];
};

type LinkType = LinkObject & {
  label: string;
  color: string;
  value: number;
};

const KnowladgeGraph: React.FC<{ eventUri: string }> = ({ eventUri }) => {
  console.log(eventUri);

  return (
    <ReactForceGraph2d
      width={1153}
      height={500}
      linkLabel="label"
      // linkColor="color"
      graphData={{
        nodes: [{ id: eventUri, group: 1 }] as NodeType[],
        links: [] as LinkType[],
      }}
      backgroundColor="#101020"
      nodeAutoColorBy="group"
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as NodeType;
        const x = node.x as number;
        const y = node.y as number;

        const label = node.id as string;
        const color = n.color as string;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(
          (n) => n + fontSize * 0.2
        ); // some padding
        // ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        // ctx.fillRect(
        //   x - bckgDimensions[0] / 2,
        //   y - bckgDimensions[1] / 2,
        //   bckgDimensions[0],
        //   bckgDimensions[1]
        // );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.fillText(label, x, y);

        n.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
      }}
      nodePointerAreaPaint={(node, color, ctx) => {
        const n = node as NodeType;
        const x = node.x as number;
        const y = node.y as number;
        ctx.fillStyle = color;
        const bckgDimensions = n.__bckgDimensions;
        bckgDimensions &&
          ctx.fillRect(
            x - bckgDimensions[0] / 2,
            y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );
      }}
      linkColor={() => "rgba(255,255,255,0.2)"}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      d3VelocityDecay={0.1}
    />
  );
};

export default KnowladgeGraph;
