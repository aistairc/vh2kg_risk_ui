import ParsingClient from "sparql-http-client/ParsingClient";
import { NamedNode, Literal } from "rdf-js";
import isEqual from "lodash.isequal";

export type ActivityQueryType = {
  activity: NamedNode;
  label: Literal;
};

const makeClient = () => {
  return new ParsingClient({ endpointUrl: "http://localhost:8080/sparql" });
};

export const PREFIXES = {
  vh2kg: "http://example.org/virtualhome2kg/ontology/",
  ex: "http://example.org/virtualhome2kg/instance/",
  hra: "http://example.org/virtualhome2kg/ontology/homeriskactivity/",
};

const activityQuery = `prefix ho: <http://www.owl-ontologies.com/VirtualHome.owl#>
prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>

select distinct ?activity ?label where { 
	?type rdfs:subClassOf* ho:Activity .
    ?activity a ?type .
    ?activity rdfs:label ?label .
} limit 100`;

export const fetchActivity: () => Promise<ActivityQueryType[]> = async () => {
  const result = (await makeClient().query.select(
    activityQuery
  )) as ActivityQueryType[];
  return result;
};

export type EventQueryType = {
  event: NamedNode;
  duration: Literal;
  action: NamedNode;
  number: Literal;
  mainObject?: NamedNode;
  mainObjectLabel?: Literal;
};

export const fetchEvent: (
  scene: NamedNode
) => Promise<EventQueryType[]> = async (sceneUri) => {
  const eventQuery = `
  PREFIX ex: <http://example.org/virtualhome2kg/instance/>
  prefix ho: <http://www.owl-ontologies.com/VirtualHome.owl#>
  prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  PREFIX time: <http://www.w3.org/2006/time#>
  PREFIX hra: <http://example.org/virtualhome2kg/ontology/homeriskactivity/>
  select distinct ?event ?number ?action ?duration ?mainObject ?mainObjectLabel where { 
    <${sceneUri.value}> vh2kg:hasEvent ?event .
    ?event vh2kg:time ?time .
    ?event vh2kg:action ?action .
    ?time time:numericDuration ?duration .
    ?event vh2kg:eventNumber ?number .
    OPTIONAL {
      ?event vh2kg:mainObject ?mainObject .
      OPTIONAL {
        ?mainObject rdfs:label ?mainObjectLabel .
      }
    }
  }`;
  const result = (await makeClient().query.select(
    eventQuery
  )) as EventQueryType[];
  return result;
};

type SituationQueryType = {
  situation: NamedNode;
};

type ObjectStateQueryType = {
  object: NamedNode;
  center1: Literal;
  center2: Literal;
  center3: Literal;
  size1: Literal;
  size2: Literal;
  size3: Literal;
};

type TargetQueryType = {
  object: NamedNode;
  target: NamedNode;
};

export type Vec3f = {
  x: number;
  y: number;
  z: number;
};

export type StateObject = {
  object: string;
  state: Set<string>;
  facing: Set<string>;
  inside: Set<string>;
  on: Set<string>;
  between: Set<string>;
  holdsLh: Set<string>;
  holdsRh: Set<string>;
  close: Set<string>;
  center: Vec3f;
  size: Vec3f;
};

export const fetchState = async (
  scene: NamedNode
): Promise<{ [key: string]: StateObject[] }> => {
  const situationQuery = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX ex: <http://example.org/virtualhome2kg/instance/>
  PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
  PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>

  select distinct ?situation where { 
    <${scene.value}> vh2kg:hasEvent ?event .
      {?event vh2kg:situationBeforeEvent ?situation .} union {
          ?event vh2kg:situationAfterEvent ?situation .
      }
  }  
  order by ASC(?situation)
  `;
  const result = (await makeClient().query.select(
    situationQuery
  )) as SituationQueryType[];

  const data: { [key: string]: StateObject[] } = {};
  let situationNumber = 0;
  for (const situation of result) {
    console.log(">>>>", situation.situation.value);
    const objectsQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?center1 ?center2 ?center3 ?size1 ?size2 ?size3 where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox x3do:bboxCenter ?center .
          ?center rdf:first ?center1 .
          ?center rdf:rest ?centerrest .
          ?centerrest rdf:first ?center2 .
          ?centerrest rdf:rest ?centerrestrest .
          ?centerrestrest rdf:first ?center3 .
          ?bbox x3do:bboxSize ?size .
          ?size rdf:first ?size1 .
          ?size rdf:rest ?sizerest .
          ?sizerest rdf:first ?size2 .
          ?sizerest rdf:rest ?sizerestrest .
          ?sizerestrest rdf:first ?size3 .
      } limit 10000
    `;

    const result = (await makeClient().query.select(
      objectsQuery
    )) as ObjectStateQueryType[];
    for (const row of result) {
      if (!(row.object.value.replace(PREFIXES.ex, "ex:") in data)) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")] = [];
      }
      data[row.object.value.replace(PREFIXES.ex, "ex:")].push({
        object: row.object.value.replace(PREFIXES.ex, "ex:"),
        state: new Set(),
        inside: new Set(),
        facing: new Set(),
        on: new Set(),
        between: new Set(),
        holdsLh: new Set(),
        holdsRh: new Set(),
        close: new Set(),
        center: {
          x: Number(row.center1.value),
          y: Number(row.center2.value),
          z: Number(row.center3.value),
        },
        size: {
          x: Number(row.size1.value),
          y: Number(row.size2.value),
          z: Number(row.size3.value),
        },
      });
    }
    {
      const stateQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX ex: <http://example.org/virtualhome2kg/instance/>
        PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
        PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
        
        select distinct ?s ?object ?target where { 
          ?s ?p <${situation.situation.value}> .
            ?s a vh2kg:State .
            ?s vh2kg:isStateOf ?object .
            ?s vh2kg:state ?target .
        } limit 10000`;

      const result = (await makeClient().query.select(
        stateQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].state.add(row.target.value.replace(PREFIXES.vh2kg, "vh2kg:"));
      }
    }

    {
      const facingQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:facing ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        facingQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].facing.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }
    {
      const insideQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:inside ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        insideQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].inside.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    {
      const onQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:on ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        onQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].on.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    {
      const betweenQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:between ?shape .
          ?state vh2kg:bbox ?shape .
          ?shape vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        betweenQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].between.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    {
      const holdLhQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:holds_lh ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        holdLhQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].holdsLh.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    {
      const holdRhQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:holds_rh ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        holdRhQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].holdsRh.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    {
      const closeQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?target where { 
        ?s ?p <${situation.situation.value}> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:close ?shape .
          ?state vh2kg:bbox ?shape .
          ?state vh2kg:isStateOf ?target .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        closeQuery
      )) as TargetQueryType[];
      for (const row of result) {
        data[row.object.value.replace(PREFIXES.ex, "ex:")][
          situationNumber
        ].close.add(row.target.value.replace(PREFIXES.ex, "ex:"));
      }
    }

    situationNumber += 1;
  }

  return data;
};

// centerとsizeは保留
export type StateItemType = {
  [key in keyof Omit<StateObject, "object" | "center" | "size">]:
    | boolean
    | undefined;
};

export const isEqurlState = (
  a: StateObject,
  b: StateObject,
  items: StateItemType
): boolean => {
  if (a.object !== b.object) {
    return false;
  }

  const keys: (keyof StateObject)[] = Object.entries(items)
    .filter(([_key, val]) => val)
    .map(([key]) => key) as (keyof StateObject)[];
  for (const key of keys) {
    if (!isEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
};

type SequenceReduceType = {
  state: StateObject | null;
  score: number;
};

export const calcDiffScoreWithKey = (
  sequence: StateObject[],
  key: keyof StateObject
) => {
  const result = sequence.reduce<SequenceReduceType>(
    (prev, cur) => {
      if (prev.state) {
        prev.score += !isEqual(prev.state[key], cur[key]) ? 1 : 0;
      }
      prev.state = cur;
      return prev;
    },
    {
      state: null,
      score: 0,
    }
  );
  return result.score;
};

export type DiffScoreType = {
  [key in keyof Omit<StateObject, "object" | "center" | "size">]: number;
};

export const calcDiffScore = (sequence: StateObject[]): DiffScoreType => {
  return {
    close: calcDiffScoreWithKey(sequence, "close"),
    state: calcDiffScoreWithKey(sequence, "state"),
    facing: calcDiffScoreWithKey(sequence, "facing"),
    inside: calcDiffScoreWithKey(sequence, "inside"),
    on: calcDiffScoreWithKey(sequence, "on"),
    between: calcDiffScoreWithKey(sequence, "between"),
    holdsLh: calcDiffScoreWithKey(sequence, "holdsLh"),
    holdsRh: calcDiffScoreWithKey(sequence, "holdsRh"),
  };
};
