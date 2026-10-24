import { beforeEach, describe, expect, it } from "vitest";
import { usePipelineStore } from "./pipelineStore";
import type {
  DatamartNode,
  PipelineEdge,
  PipelineNode,
  ResourceNode,
} from "../../../types/pipeline";

describe("pipelineStore", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      viewStack: [],
    });
  });

  it("adds and selects a node", () => {
    const node: ResourceNode = {
      id: "table-1",
      type: "resource",
      position: { x: 100, y: 100 },
      data: {
        category: "resource",
        kind: "table",
        label: "Users",
        description: "",
        columns: [],
      },
    };

    usePipelineStore.getState().addNode(node);
    expect(usePipelineStore.getState().nodes).toHaveLength(1);

    usePipelineStore.getState().selectNode("table-1");
    expect(usePipelineStore.getState().selectedNodeId).toBe("table-1");

    usePipelineStore.getState().selectNode(null);
    expect(usePipelineStore.getState().selectedNodeId).toBeNull();
  });

  it("updates node data", () => {
    const node: ResourceNode = {
      id: "table-2",
      type: "resource",
      position: { x: 0, y: 0 },
      data: {
        category: "resource",
        kind: "table",
        label: "Orders",
        description: "",
        columns: [],
      },
    };

    usePipelineStore.getState().addNode(node);
    usePipelineStore
      .getState()
      .updateNodeData("table-2", { description: "Updated description" });

    const updated = usePipelineStore
      .getState()
      .nodes.find((n) => n.id === "table-2");
    expect(updated?.data.description).toBe("Updated description");
  });

  it("deletes a node and any connected edges", () => {
    const n1: PipelineNode = {
      id: "src-1",
      type: "resource",
      position: { x: 0, y: 0 },
      data: {
        category: "resource",
        kind: "table",
        label: "Src",
        description: "",
        columns: [],
      },
    };
    const n2: PipelineNode = {
      id: "proc-1",
      type: "processing",
      position: { x: 200, y: 0 },
      data: {
        category: "processing",
        label: "Proc",
        description: "",
        language: "sql",
        code: "",
        inputColumns: [],
        outputColumns: [],
      },
    };
    const edge: PipelineEdge = {
      id: "e-1",
      source: "src-1",
      target: "proc-1",
    };

    usePipelineStore.setState({ nodes: [n1, n2], edges: [edge] });
    expect(usePipelineStore.getState().edges).toHaveLength(1);

    usePipelineStore.getState().deleteNode("src-1");
    expect(usePipelineStore.getState().nodes).toHaveLength(1);
    expect(usePipelineStore.getState().edges).toHaveLength(0);
  });

  it("reconciles remote node and edge events from WebSocket", () => {
    const remoteNode: ResourceNode = {
      id: "remote-1",
      type: "resource",
      position: { x: 50, y: 50 },
      data: {
        category: "resource",
        kind: "table",
        label: "RemoteTable",
        description: "",
        columns: [],
      },
    };

    usePipelineStore.getState().applyRemoteNode(remoteNode);
    expect(usePipelineStore.getState().nodes).toHaveLength(1);
    expect(usePipelineStore.getState().nodes[0].id).toBe("remote-1");

    const remoteEdge: PipelineEdge = {
      id: "edge-remote-1",
      source: "remote-1",
      target: "remote-2",
    };

    usePipelineStore.getState().applyRemoteEdge(remoteEdge);
    expect(usePipelineStore.getState().edges).toHaveLength(1);

    usePipelineStore.getState().removeRemoteEdge("edge-remote-1");
    expect(usePipelineStore.getState().edges).toHaveLength(0);

    usePipelineStore.getState().removeRemoteNode("remote-1");
    expect(usePipelineStore.getState().nodes).toHaveLength(0);
  });

  it("manages hierarchical drilldown into and out of datamarts", () => {
    const innerNode: PipelineNode = {
      id: "mart-child",
      type: "resource",
      position: { x: 10, y: 10 },
      data: {
        category: "resource",
        kind: "table",
        label: "Child Table",
        description: "",
        columns: [],
      },
    };

    const martNode: DatamartNode = {
      id: "mart-container",
      type: "datamart",
      position: { x: 0, y: 0 },
      data: {
        category: "datamart",
        label: "Sales Mart",
        description: "",
        containerKind: "datamart",
        children: { nodes: [innerNode], edges: [] },
      },
    };

    usePipelineStore.setState({ nodes: [martNode], edges: [] });

    // Drill down
    usePipelineStore.getState().enterDatamart("mart-container");
    expect(usePipelineStore.getState().viewStack).toHaveLength(1);
    expect(
      usePipelineStore.getState().nodes.some((n) => n.id === "mart-child"),
    ).toBe(true);

    // Return to root
    usePipelineStore.getState().exitToRoot();
    expect(usePipelineStore.getState().viewStack).toHaveLength(0);
    expect(
      usePipelineStore.getState().nodes.some((n) => n.id === "mart-container"),
    ).toBe(true);
  });
});
