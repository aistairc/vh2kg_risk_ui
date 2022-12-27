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

type StateQueryType = {
  object: NamedNode;
  state: NamedNode;
};

type FacingQueryType = {
  object: NamedNode;
  facing: NamedNode;
};
type OnQueryType = {
  object: NamedNode;
  on: NamedNode;
};
type InsideQueryType = {
  object: NamedNode;
  inside: NamedNode;
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
      if (!(row.object.value in data)) {
        data[row.object.value] = [];
      }
      data[row.object.value].push({
        object: row.object.value,
        state: new Set(),
        inside: new Set(),
        facing: new Set(),
        on: new Set(),
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
        
        select distinct ?s ?object ?state where { 
          ?s ?p <${situation.situation.value}> .
            ?s a vh2kg:State .
            ?s vh2kg:isStateOf ?object .
            ?s vh2kg:state ?state .
        } limit 10000`;

      const result = (await makeClient().query.select(
        stateQuery
      )) as StateQueryType[];
      for (const row of result) {
        data[row.object.value][situationNumber].state.add(row.state.value);
      }
    }

    {
      const facingQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?facing where { 
        ?s ?p <http://example.org/virtualhome2kg/instance/home_situation0_wash_pillow_scene1> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:facing ?facingShape .
          ?facingState vh2kg:bbox ?facingShape .
          ?facingState vh2kg:isStateOf ?facing .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        facingQuery
      )) as FacingQueryType[];
      for (const row of result) {
        data[row.object.value][situationNumber].facing.add(row.facing.value);
      }
    }
    {
      const insideQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?inside where { 
        ?s ?p <http://example.org/virtualhome2kg/instance/home_situation0_wash_pillow_scene1> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:inside ?insideShape .
          ?insideState vh2kg:bbox ?insideShape .
          ?insideState vh2kg:isStateOf ?inside .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        insideQuery
      )) as InsideQueryType[];
      for (const row of result) {
        data[row.object.value][situationNumber].inside.add(row.inside.value);
      }
    }

    {
      const onQuery = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX ex: <http://example.org/virtualhome2kg/instance/>
      PREFIX vh2kg: <http://example.org/virtualhome2kg/ontology/>
      PREFIX x3do: <https://www.web3d.org/specifications/X3dOntology4.0#>
      
      select distinct ?s ?object ?on where { 
        ?s ?p <http://example.org/virtualhome2kg/instance/home_situation0_wash_pillow_scene1> .
          ?s a vh2kg:State .
          ?s vh2kg:isStateOf ?object .
          ?s vh2kg:bbox ?bbox .
          ?bbox vh2kg:on ?onShape .
          ?onState vh2kg:bbox ?onShape .
          ?onState vh2kg:isStateOf ?on .
      } limit 10000
      `;

      const result = (await makeClient().query.select(
        onQuery
      )) as OnQueryType[];
      for (const row of result) {
        data[row.object.value][situationNumber].on.add(row.on.value);
      }
    }

    situationNumber += 1;
  }

  return data;
};

export const isEqurlState = (a: StateObject, b: StateObject): boolean => {
  if (
    a.object === b.object &&
    isEqual(a.state, b.state) &&
    a.center.x === b.center.x &&
    a.center.y === b.center.y &&
    a.center.z === b.center.z &&
    a.size.x === b.size.x &&
    a.size.y === b.size.y &&
    a.size.z === b.size.z &&
    isEqual(a.facing, b.facing) &&
    isEqual(a.inside, b.inside) &&
    isEqual(a.on, b.on)
  ) {
    return true;
  }
  return false;
};
