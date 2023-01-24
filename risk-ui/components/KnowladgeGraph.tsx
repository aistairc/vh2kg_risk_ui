import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactForceGraph2d from "react-force-graph-2d";
import type { NodeObject, LinkObject } from "react-force-graph-2d";
import { NamedNode } from "rdf-js";
import { fetchTriples, PREFIXES } from "../utils/sparql";

type NodeType = NodeObject & {
  label?: string;
  color?: string;
  group: number;
  __bckgDimensions?: number[];
};

type LinkType = LinkObject & {
  label: string;
  color?: string;
  value?: number;
};

type LinkValueType = {
  source: string;
  target: string;
  label: string;
};

const shortUri = (nodeUri: string) => {
  for (const [key, v] of Object.entries(PREFIXES)) {
    if (nodeUri.includes(v)) {
      return nodeUri.replace(v, `${key}:`);
    }
  }
  return nodeUri;
};

const KnowladgeGraph: React.FC<{ eventNode: NamedNode<string> | null }> = ({
  eventNode,
}) => {
  const [fetchedDetailNodes, setFetchedDetailNodeds] = useState<{
    [key: string]: true;
  }>({});
  const [nodes, setNodes] = useState<{ [key: string]: NodeType }>({});
  const [links, setLinks] = useState<LinkValueType[]>([]);

  const addNode = useCallback(
    async (node: string) => {
      const nodeId = shortUri(node);
      if (nodeId in fetchedDetailNodes) {
        return;
      }

      setFetchedDetailNodeds({
        ...fetchedDetailNodes,
        ...{ [nodeId]: true },
      });
      const _result = await fetchTriples(node);
      const resultNode = _result.filter(({ o }) => {
        return o.termType === "NamedNode";
      });
      const resultLiteral = _result.filter(({ o }) => {
        return o.termType === "Literal";
      });

      const label = resultLiteral.reduce((prev, { p, o }) => {
        prev += `→ ${shortUri(p.value)} ${shortUri(o.value)}<br>`;
        return prev;
      }, "");

      const nodeValues = resultNode.reduce<{ [key: string]: NodeType }>(
        (prev, { o }) => {
          const id = shortUri(o.value);
          prev[id] = {
            id,
            group: 0,
          };
          return prev;
        },
        {}
      );
      const _nodes = {
        ...nodes,
        ...{ [nodeId]: { id: nodeId, label, group: 0 } },
        ...nodeValues,
      };
      setNodes(_nodes);
      const linkValues = resultNode.map<LinkValueType>(({ p, o }) => {
        const value = {
          source: nodeId,
          target: shortUri(o.value),
          label: shortUri(p.value),
        };
        return value;
      });
      setLinks([...links, ...linkValues]);
    },
    [fetchedDetailNodes, nodes, links]
  );

  useEffect(() => {
    if (!eventNode) {
      setNodes({});
      setLinks([]);
      setFetchedDetailNodeds({});
      return;
    }

    (async () => {
      await addNode(shortUri(eventNode.value));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventNode]);

  const nodesArray = useMemo(() => {
    console.log("create node array");
    return Object.values(nodes);
  }, [nodes]);

  const _links: LinkType[] = useMemo(() => {
    return links.map(({ source, target, label }) => {
      return {
        source,
        target,
        label,
      };
    });
  }, [links]);

  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as NodeType;
      const x = node.x as number;
      const y = node.y as number;

      const label = node.id as string;

      let color = n.color as string;
      if (n.id === shortUri(eventNode?.value ?? "")) {
        color = "red";
      } else if (fetchedDetailNodes[n.id ?? ""]) {
        color = "yellow";
      }
      const fontSize = 14 / globalScale;
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
    },
    [eventNode?.value, fetchedDetailNodes]
  );

  const onNodeClick = useCallback(
    (node: NodeObject) => {
      addNode(node.id as string);
    },
    [addNode]
  );

  useEffect(() => {
    console.log("links---");
    for (const l of links) {
      console.log(l.source, l.target);
    }
    console.log("---");
  }, [links]);
  return (
    <ReactForceGraph2d
      width={1153}
      height={500}
      nodeLabel="label"
      linkLabel="label"
      // linkColor="color"
      graphData={{
        nodes: nodesArray,
        links: _links,
      }}
      backgroundColor="#101020"
      nodeAutoColorBy="group"
      onNodeClick={onNodeClick}
      nodeCanvasObject={nodeCanvasObject}
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
      linkColor={() => "rgba(255,255,255,0.3)"}
      linkDirectionalParticles={2}
      linkDirectionalParticleWidth={2}
      d3VelocityDecay={0.1}
    />
  );
};

export default KnowladgeGraph;
