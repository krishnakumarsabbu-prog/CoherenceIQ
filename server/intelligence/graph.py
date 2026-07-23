from __future__ import annotations
from typing import List, Dict, Any, Tuple
import networkx as nx
from models import Rule, EngineeredFeature

class GraphEngine:
    """Uses NetworkX to build a dependency graph, running PageRank, components, and Louvain detection."""

    def __init__(self) -> None:
        self.G = nx.Graph()

    def build_dependency_graph(self, rules: List[Rule], features: List[EngineeredFeature]) -> nx.Graph:
        self.G.clear()
        
        # 1. Add Domain nodes
        domains = sorted({f.domain for f in features})
        for d in domains:
            self.G.add_node(f"domain:{d}", type="domain", label=d)
            
        # 2. Add Feature nodes & link to domains
        for f in features:
            f_node = f"feature:{f.feature_name}"
            self.G.add_node(f_node, type="feature", label=f.feature_name, domain=f.domain)
            self.G.add_edge(f_node, f"domain:{f.domain}", weight=1.0, kind="feature-domain")
            
        # 3. Add Rule nodes & link to features they derive
        for r in rules:
            r_node = f"rule:{r.rule_id}"
            self.G.add_node(r_node, type="rule", label=r.rule_name, cluster=r.primary_cluster)
            for f in features:
                if r.rule_id in f.derived_rules:
                    # Weight represents the degree of dependency (e.g. parameter overlap ratio or 1.0)
                    self.G.add_edge(r_node, f"feature:{f.feature_name}", weight=1.0, kind="rule-feature")
                    
        return self.G

    def compute_pagerank(self) -> Dict[str, float]:
        if len(self.G) == 0:
            return {}
        try:
            return nx.pagerank(self.G, weight="weight")
        except Exception:
            # Fallback uniform centrality if graph contains disconnected components that break default pagerank
            return {node: 1.0 / len(self.G) for node in self.G.nodes}

    def detect_louvain_communities(self) -> List[List[str]]:
        if len(self.G) == 0:
            return []
        try:
            from networkx.algorithms.community import louvain_communities
            communities_sets = louvain_communities(self.G, weight="weight")
            return [list(c) for c in communities_sets]
        except Exception:
            # Fallback to connected components if louvain community detection fails
            return [list(c) for c in nx.connected_components(self.G)]

    def get_connected_components(self) -> List[List[str]]:
        return [list(c) for c in nx.connected_components(self.G)]

    def export_graph_json(self) -> Dict[str, Any]:
        """Exports nodes and edges in a format readable by the React Flow frontend."""
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        
        pageranks = self.compute_pagerank()
        
        for n, attrs in self.G.nodes(data=True):
            node_data = {
                "id": n,
                "type": attrs.get("type", "rule"),
                "label": attrs.get("label", ""),
                "centrality": round(pageranks.get(n, 0.0), 4)
            }
            if "domain" in attrs:
                node_data["domain"] = attrs["domain"]
            if "cluster" in attrs:
                node_data["cluster"] = attrs["cluster"]
            nodes.append(node_data)
            
        for u, v, attrs in self.G.edges(data=True):
            kind = attrs.get("kind", "dependency")
            u_type = self.G.nodes[u].get("type")
            
            # Direct source/target based on node hierarchies expected by the frontend
            source = u
            target = v
            if kind == "rule-feature":
                if u_type == "feature":
                    source, target = v, u
            elif kind == "feature-domain":
                if u_type == "domain":
                    source, target = v, u
            
            edges.append({
                "id": f"e-{source}-{target}",
                "source": source,
                "target": target,
                "weight": attrs.get("weight", 1.0),
                "kind": kind
            })
            
        return {"nodes": nodes, "edges": edges}



class KnowledgeGraphBuilder:
    """Builds an enterprise semantic Knowledge Graph from Rules and Features metadata."""

    def build_kg(self, rules: List[Rule], features: List[EngineeredFeature]) -> Dict[str, Any]:
        kg_nodes = []
        kg_edges = []
        
        # Register domains
        domains = sorted({f.domain for f in features})
        for d in domains:
            kg_nodes.append({
                "@id": f"domain:{d}",
                "@type": "Domain",
                "name": d,
                "description": f"Security classification domain: {d}"
            })
            
        # Register features
        for f in features:
            kg_nodes.append({
                "@id": f"feature:{f.feature_name}",
                "@type": "EngineeredFeature",
                "name": f.feature_name,
                "weight": f.weight,
                "description": f.description
            })
            kg_edges.append({
                "source": f"feature:{f.feature_name}",
                "relation": "belongsToDomain",
                "target": f"domain:{f.domain}"
            })
            
        # Register rules and entities
        for r in rules:
            kg_nodes.append({
                "@id": f"rule:{r.rule_id}",
                "@type": "SecurityRule",
                "name": r.rule_name,
                "riskLevel": r.risk_level,
                "status": r.status,
                "description": r.description
            })
            
            # Map rules to primary domains
            kg_edges.append({
                "source": f"rule:{r.rule_id}",
                "relation": "classifiedUnder",
                "target": f"domain:{r.primary_cluster}"
            })
            
            if r.secondary_cluster:
                kg_edges.append({
                    "source": f"rule:{r.rule_id}",
                    "relation": "backupClassification",
                    "target": f"domain:{r.secondary_cluster}"
                })
                
            # Connect rule to parameters as conceptual entities
            for p in r.parameters:
                p_clean = p.replace(" ", "_")
                kg_nodes.append({
                    "@id": f"parameter:{p_clean}",
                    "@type": "RuleParameter",
                    "name": p
                })
                kg_edges.append({
                    "source": f"rule:{r.rule_id}",
                    "relation": "evaluatesParameter",
                    "target": f"parameter:{p_clean}"
                })

        return {
            "@context": "https://coherenceiq.ai/contexts/rules.jsonld",
            "nodes": kg_nodes,
            "edges": kg_edges
        }
