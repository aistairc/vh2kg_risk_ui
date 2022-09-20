import ParsingClient from "sparql-http-client/ParsingClient";
import { NamedNode, Literal } from "rdf-js";

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
  risk: NamedNode | undefined;
};

export const fetchEvent: (
  sceneUri: string
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
  select distinct ?event ?number ?action ?duration ?risk where { 
    ${sceneUri} vh2kg:hasEvent ?event .
      ?event vh2kg:time ?time .
      ?event vh2kg:action ?action .
      ?time time:numericDuration ?duration .
      ?event vh2kg:eventNumber ?number .
    optional {
      ?event a ?risk .
      ?risk rdfs:subClassOf <http://example.org/virtualhome2kg/ontology/homeriskactivity/RiskEvent> .
    }
  }`;
  const result = (await makeClient().query.select(
    eventQuery
  )) as EventQueryType[];
  console.log(result);
  return result;
};
