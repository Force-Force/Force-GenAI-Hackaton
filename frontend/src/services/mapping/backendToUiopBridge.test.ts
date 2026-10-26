import { beforeEach, describe, expect, it } from 'vitest';
import { handleBackendQuestionPrompt } from './backendToUiopBridge';
import { usePlanStore } from '../../features/uiop/store/planStore';

describe('handleBackendQuestionPrompt', () => {
  beforeEach(() => {
    usePlanStore.getState().resetProtocolState();
    usePlanStore.setState({ questions: [], isMockSeedData: false });
  });

  it("shows the agent's question and its own choices", () => {
    const report = handleBackendQuestionPrompt({
      id: '7f714a07-c917-40d9-941f-a70c288905a2',
      status: 'PENDING',
      agent_role: 'GUARDIAN',
      question_text: 'Des données personnelles ont été détectées. Quel niveau de masquage appliquer ?',
      choices: ['Masquage strict', 'Masquage partiel', 'Anonymisation complète'],
    });

    expect(report.ok).toBe(true);
    const question = usePlanStore.getState().questions.find((q) => q.id === '7f714a07-c917-40d9-941f-a70c288905a2');
    expect(question?.question).toContain('niveau de masquage');
    expect(question?.options.map((o) => o.label)).toEqual(['Masquage strict', 'Masquage partiel', 'Anonymisation complète']);
    expect(question?.options[0].id).toBe('Masquage strict');
    expect(question?.context).toContain('GUARDIAN');
  });
});
