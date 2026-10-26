import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "./chatStore";
import { usePipelineStore } from "../../workspace/store/pipelineStore";
import { useWorkspaceStore } from "../../workspace/store/workspaceStore";
import { usePlanStore } from "../../uiop/store/planStore";
import { synthesizeUiopFromPrompt } from "../../uiop/adapter/promptToUiopAdapter";
import { useBackendStore } from "../../../services/session/backendSession";
import type { ProcessingNode } from "../../../types/pipeline";

describe("chatStore", () => {
  beforeEach(() => {
    usePipelineStore.setState({
      nodes: [],
      edges: [],
    });
    usePlanStore.getState().resetProtocolState();
    useChatStore.setState({
      messages: [],
      isGenerating: false,
    });
    useWorkspaceStore.setState({ activeTab: "canvas" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores empty or whitespace messages", async () => {
    await useChatStore.getState().sendMessage("   ");
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(useChatStore.getState().isGenerating).toBe(false);
  });

  it("records the question but never invents an answer when the backend is unreachable", async () => {
    useBackendStore.setState({ isOnline: false, checkHealth: async () => false });

    await useChatStore.getState().sendMessage("Add a new dimension table");

    const msgs = useChatStore.getState().messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].sender).toBe("user");
    expect(msgs[0].text).toBe("Add a new dimension table");
    expect(msgs[1].sender).toBe("assistant");
    expect(msgs[1].text).toContain("Backend unreachable");
    expect(msgs[1].uiop).toBeFalsy();
  });

  it("applies a UIOP batch when applyUiop is called", () => {
    const { envelope } = synthesizeUiopFromPrompt("Add a new dimension table");
    expect(envelope).toBeTruthy();

    const report = useChatStore.getState().applyUiop(envelope!);
    expect(report.ok).toBe(true);
    expect(usePipelineStore.getState().nodes.length).toBeGreaterThan(0);
  });

  it("submits processing code and prompts Master Agent review", async () => {
    const node: ProcessingNode = {
      id: "step-1",
      type: "processing",
      position: { x: 0, y: 0 },
      data: {
        category: "processing",
        label: "Transform",
        description: "",
        language: "sql",
        code: "SELECT 1;",
        inputColumns: [],
        outputColumns: [],
      },
    };
    usePipelineStore.setState({ nodes: [node] });

    await useChatStore
      .getState()
      .submitProcessingCode("step-1", "sql", "SELECT * FROM raw;");

    const updatedNode = usePipelineStore
      .getState()
      .nodes.find((n) => n.id === "step-1");
    expect((updatedNode?.data as { code: string }).code).toBe(
      "SELECT * FROM raw;",
    );

    const userMsg = useChatStore
      .getState()
      .messages.find((m) => m.sender === "user");
    expect(userMsg?.text).toContain("Please review it:");
  });
});
