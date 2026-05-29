"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  CampaignPlan,
  CampaignPlanSectionKey,
  ApprovalRequest,
  Advertiser,
  StrategyPlan,
  CFONarrative,
  AudienceSegment,
  CompetitiveBrief,
  OperatorPlan,
} from "@/types/campaign";
import { approvers } from "@/data/approvers";
import { personas } from "@/data/personas";
import type { PersonaId } from "@/types/persona";
import {
  loadStrategies,
  persistStrategies,
  loadAdvertisers,
  persistAdvertisers,
  loadNarratives,
  persistNarratives,
  loadAudiences,
  persistAudiences,
  loadApprovals,
  persistApprovals,
  loadBriefs,
  persistBriefs,
} from "@/lib/storage";
import { ensureReturningSeed } from "@/data/seed-returning";

interface CampaignContextValue {
  activePlan: CampaignPlan | null;
  setActivePlan: (plan: CampaignPlan | null) => void;
  updateSection: (key: CampaignPlanSectionKey, value: string) => void;
  advertiser: Advertiser | null;
  setAdvertiser: (advertiser: Advertiser) => void;
  activeStrategy: StrategyPlan | null;
  setActiveStrategy: (plan: StrategyPlan | null) => void;
  savedStrategies: StrategyPlan[];
  savedAdvertisers: Advertiser[];
  saveStrategy: (plan: StrategyPlan) => void;
  loadStrategy: (id: string) => void;
  duplicateStrategy: (id: string) => void;
  renameStrategy: (id: string, name: string) => void;
  archiveStrategy: (id: string) => void;
  removeStrategy: (id: string) => void;
  savedNarratives: CFONarrative[];
  activeNarrative: CFONarrative | null;
  setActiveNarrative: (narrative: CFONarrative | null) => void;
  saveNarrative: (narrative: CFONarrative) => void;
  loadNarrative: (id: string) => void;
  savedBriefs: CompetitiveBrief[];
  activeBrief: CompetitiveBrief | null;
  setActiveBrief: (brief: CompetitiveBrief | null) => void;
  saveBrief: (brief: CompetitiveBrief) => void;
  loadBrief: (id: string) => void;
  activeOperator: OperatorPlan | null;
  setActiveOperator: (operator: OperatorPlan | null) => void;
  removeNarrative: (id: string) => void;
  duplicateNarrative: (id: string) => void;
  renameNarrative: (id: string, name: string) => void;
  activeAudience: AudienceSegment | null;
  setActiveAudience: (audience: AudienceSegment | null) => void;
  savedAudiences: AudienceSegment[];
  saveAudience: (audience: AudienceSegment) => void;
  loadAudience: (id: string) => void;
  duplicateAudience: (id: string) => void;
  renameAudience: (id: string, name: string) => void;
  archiveAudience: (id: string) => void;
  removeAudience: (id: string) => void;
  approvalRequests: ApprovalRequest[];
  sendForApproval: (strategyId: string, approverId: string, senderPersonaId: PersonaId) => void;
  resolveApproval: (
    requestId: string,
    resolution: "approved" | "changes-requested" | "rejected",
    comment?: string,
    resolverPersonaId?: PersonaId
  ) => void;
  addComment: (requestId: string, authorId: PersonaId, content: string) => void;
  activateStrategy: (requestId: string) => void;
  getPendingForPersona: (personaId: PersonaId) => ApprovalRequest[];
  toast: { message: string; visible: boolean; action?: { label: string; href: string } };
  dismissToast: () => void;
  showToast: (message: string, action?: { label: string; href: string }) => void;
  /** True once localStorage data has been loaded into state — prevents hydration mismatches. */
  hydrated: boolean;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

let commentId = 0;

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [activePlan, setActivePlan] = useState<CampaignPlan | null>(null);
  const [advertiser, setAdvertiserState] = useState<Advertiser | null>(null);
  const [activeStrategy, setActiveStrategy] = useState<StrategyPlan | null>(null);
  const [savedStrategies, setSavedStrategies] = useState<StrategyPlan[]>([]);
  const [savedAdvertisers, setSavedAdvertisers] = useState<Advertiser[]>([]);
  const [savedNarratives, setSavedNarratives] = useState<CFONarrative[]>([]);
  const [activeNarrative, setActiveNarrative] = useState<CFONarrative | null>(null);
  const [savedBriefs, setSavedBriefs] = useState<CompetitiveBrief[]>([]);
  const [activeBrief, setActiveBrief] = useState<CompetitiveBrief | null>(null);
  const [activeOperator, setActiveOperator] = useState<OperatorPlan | null>(null);
  const [activeAudience, setActiveAudience] = useState<AudienceSegment | null>(null);
  const [savedAudiences, setSavedAudiences] = useState<AudienceSegment[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(
    []
  );
  const [toast, setToast] = useState<{ message: string; visible: boolean; action?: { label: string; href: string } }>({ message: "", visible: false });
  // Use STATE (not ref) so hydrated batches with loaded data — prevents
  // the persistence effect from writing [] on the first render.
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    // Ensure the returning-user workspace is populated before hydrating (idempotent).
    ensureReturningSeed();
    setSavedStrategies(loadStrategies());
    setSavedAdvertisers(loadAdvertisers());
    setSavedNarratives(loadNarratives());
    setSavedAudiences(loadAudiences());
    setApprovalRequests(loadApprovals());
    setSavedBriefs(loadBriefs());
    setHydrated(true);
  }, []);

  // Persist strategies to localStorage on change (skip until hydration render)
  useEffect(() => {
    if (hydrated) persistStrategies(savedStrategies);
  }, [savedStrategies, hydrated]);

  // Persist advertisers to localStorage on change
  useEffect(() => {
    if (hydrated) persistAdvertisers(savedAdvertisers);
  }, [savedAdvertisers, hydrated]);

  // Persist narratives to localStorage on change
  useEffect(() => {
    if (hydrated) persistNarratives(savedNarratives);
  }, [savedNarratives, hydrated]);

  // Persist competitive briefs to localStorage on change
  useEffect(() => {
    if (hydrated) persistBriefs(savedBriefs);
  }, [savedBriefs, hydrated]);

  // Persist audiences to localStorage on change
  useEffect(() => {
    if (hydrated) persistAudiences(savedAudiences);
  }, [savedAudiences, hydrated]);

  // Persist approval requests to localStorage on change — without this the
  // cross-persona handoff is lost when switching persona reloads the app.
  useEffect(() => {
    if (hydrated) persistApprovals(approvalRequests);
  }, [approvalRequests, hydrated]);

  const setAdvertiser = useCallback((adv: Advertiser) => {
    setAdvertiserState(adv);
    setSavedAdvertisers((prev) => {
      const exists = prev.findIndex((a) => a.id === adv.id);
      let next: Advertiser[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = adv;
      } else {
        next = [...prev, adv];
      }
      persistAdvertisers(next);
      return next;
    });
  }, []);

  const saveStrategy = useCallback((plan: StrategyPlan) => {
    setSavedStrategies((prev) => {
      const exists = prev.findIndex((s) => s.id === plan.id);
      let next: StrategyPlan[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = plan;
      } else {
        next = [...prev, plan];
      }
      // Belt-and-suspenders: persist immediately so data survives even if
      // the React effect doesn't flush before navigation or unmount.
      persistStrategies(next);
      return next;
    });
  }, []);

  const loadStrategy = useCallback((id: string) => {
    const found = savedStrategies.find((s) => s.id === id);
    if (found) setActiveStrategy(found);
  }, [savedStrategies]);

  const duplicateStrategy = useCallback((id: string) => {
    const found = savedStrategies.find((s) => s.id === id);
    if (!found) return;
    const copy: StrategyPlan = {
      ...found,
      id: `strategy-${Date.now()}`,
      name: `${found.name} (copy)`,
      status: "draft",
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: "user",
    };
    setSavedStrategies((prev) => {
      const next = [copy, ...prev];
      persistStrategies(next);
      return next;
    });
  }, [savedStrategies]);

  const renameStrategy = useCallback((id: string, name: string) => {
    setSavedStrategies((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, name, lastModifiedAt: new Date().toISOString() } : s
      );
      persistStrategies(next);
      return next;
    });
  }, []);

  const archiveStrategy = useCallback((id: string) => {
    setSavedStrategies((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? { ...s, status: "archived" as const, lastModifiedAt: new Date().toISOString() }
          : s
      );
      persistStrategies(next);
      return next;
    });
    if (activeStrategy?.id === id) setActiveStrategy(null);
  }, [activeStrategy]);

  const removeStrategy = useCallback((id: string) => {
    setSavedStrategies((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistStrategies(next);
      return next;
    });
    if (activeStrategy?.id === id) setActiveStrategy(null);
  }, [activeStrategy]);

  const saveNarrative = useCallback((narrative: CFONarrative) => {
    setSavedNarratives((prev) => {
      const exists = prev.findIndex((n) => n.id === narrative.id);
      let next: CFONarrative[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = narrative;
      } else {
        next = [...prev, narrative];
      }
      persistNarratives(next);
      return next;
    });
  }, []);

  const loadNarrative = useCallback((id: string) => {
    const found = savedNarratives.find((n) => n.id === id);
    if (found) setActiveNarrative(found);
  }, [savedNarratives]);

  const saveBrief = useCallback((brief: CompetitiveBrief) => {
    setSavedBriefs((prev) => {
      const exists = prev.findIndex((b) => b.id === brief.id);
      let next: CompetitiveBrief[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = brief;
      } else {
        next = [...prev, brief];
      }
      persistBriefs(next);
      return next;
    });
  }, []);

  const loadBrief = useCallback((id: string) => {
    const found = savedBriefs.find((b) => b.id === id);
    if (found) setActiveBrief(found);
  }, [savedBriefs]);

  const removeNarrative = useCallback((id: string) => {
    setSavedNarratives((prev) => prev.filter((n) => n.id !== id));
    if (activeNarrative?.id === id) setActiveNarrative(null);
  }, [activeNarrative]);

  const renameNarrative = useCallback((id: string, name: string) => {
    setSavedNarratives((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, name, lastModifiedAt: new Date().toISOString() } : n
      )
    );
  }, []);

  const duplicateNarrative = useCallback((id: string) => {
    const found = savedNarratives.find((n) => n.id === id);
    if (!found) return;
    const copy: CFONarrative = {
      ...found,
      id: `narrative-${Date.now()}`,
      name: `${found.name} (copy)`,
      lastModifiedAt: new Date().toISOString(),
    };
    setSavedNarratives((prev) => [copy, ...prev]);
  }, [savedNarratives]);

  const saveAudience = useCallback((audience: AudienceSegment) => {
    setSavedAudiences((prev) => {
      const exists = prev.findIndex((a) => a.id === audience.id);
      let next: AudienceSegment[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = audience;
      } else {
        next = [...prev, audience];
      }
      persistAudiences(next);
      return next;
    });
  }, []);

  const loadAudience = useCallback((id: string) => {
    const found = savedAudiences.find((a) => a.id === id);
    if (found) setActiveAudience(found);
  }, [savedAudiences]);

  const duplicateAudience = useCallback((id: string) => {
    const found = savedAudiences.find((a) => a.id === id);
    if (!found) return;
    const copy: AudienceSegment = {
      ...found,
      id: `audience-${Date.now()}`,
      name: `${found.name} (copy)`,
      status: "draft",
      lastModifiedAt: new Date().toISOString(),
    };
    setSavedAudiences((prev) => {
      const next = [copy, ...prev];
      persistAudiences(next);
      return next;
    });
  }, [savedAudiences]);

  const renameAudience = useCallback((id: string, name: string) => {
    setSavedAudiences((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, name, lastModifiedAt: new Date().toISOString() } : a
      );
      persistAudiences(next);
      return next;
    });
  }, []);

  const archiveAudience = useCallback((id: string) => {
    setSavedAudiences((prev) => {
      const next = prev.map((a) =>
        a.id === id
          ? { ...a, status: "archived" as const, lastModifiedAt: new Date().toISOString() }
          : a
      );
      persistAudiences(next);
      return next;
    });
    if (activeAudience?.id === id) setActiveAudience(null);
  }, [activeAudience]);

  const removeAudience = useCallback((id: string) => {
    setSavedAudiences((prev) => {
      const next = prev.filter((a) => a.id !== id);
      persistAudiences(next);
      return next;
    });
    if (activeAudience?.id === id) setActiveAudience(null);
  }, [activeAudience]);

  const dismissToast = useCallback(() => {
    setToast({ message: "", visible: false });
  }, []);

  const showToast = useCallback((message: string, action?: { label: string; href: string }) => {
    setToast({ message, visible: true, action });
    setTimeout(() => setToast({ message: "", visible: false }), action ? 6000 : 4000);
  }, []);

  const updateSection = useCallback(
    (key: CampaignPlanSectionKey, value: string) => {
      setActivePlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [key]: { ...prev.sections[key], value },
          },
        };
      });
    },
    []
  );

  // Update a saved strategy's status in place (and active/persist).
  const setStrategyStatus = useCallback(
    (strategyId: string, status: StrategyPlan["status"]) => {
      setSavedStrategies((prev) => {
        const next = prev.map((s) =>
          s.id === strategyId
            ? { ...s, status, lastModifiedAt: new Date().toISOString() }
            : s
        );
        persistStrategies(next);
        return next;
      });
      setActiveStrategy((prev) =>
        prev && prev.id === strategyId ? { ...prev, status } : prev
      );
    },
    []
  );

  const sendForApproval = useCallback(
    (strategyId: string, approverId: string, senderPersonaId: PersonaId) => {
      const strategy = savedStrategies.find((s) => s.id === strategyId);
      const approver = approvers.find((a) => a.id === approverId);
      const sender = personas.find((p) => p.id === senderPersonaId);
      if (!strategy || !approver || !sender) return;

      const updatedStrategy: StrategyPlan = {
        ...strategy,
        status: "pending-approval",
        lastModifiedAt: new Date().toISOString(),
      };

      const request: ApprovalRequest = {
        id: `approval-${Date.now()}`,
        strategy: updatedStrategy,
        sentBy: senderPersonaId,
        sentByName: sender.name,
        sentTo: approverId,
        sentToName: approver.name,
        sentAt: new Date().toLocaleString(),
        comments: [],
      };

      setStrategyStatus(strategyId, "pending-approval");
      setApprovalRequests((prev) => [...prev, request]);
      showToast(`Sent to ${approver.name} for approval`);
    },
    [savedStrategies, setStrategyStatus, showToast]
  );

  const resolveApproval = useCallback(
    (
      requestId: string,
      resolution: "approved" | "changes-requested" | "rejected",
      comment?: string,
      resolverPersonaId?: PersonaId
    ) => {
      const newStatus: StrategyPlan["status"] =
        resolution === "approved" ? "approved" : "draft";

      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;

          const newComments = [...req.comments];
          if (comment && resolverPersonaId) {
            const resolver = personas.find((p) => p.id === resolverPersonaId);
            newComments.push({
              id: `comment-${++commentId}`,
              authorId: resolverPersonaId,
              authorName: resolver?.name || "Unknown",
              content: comment,
              timestamp: new Date().toLocaleString(),
            });
          }

          // Sync the request's strategy snapshot status too.
          setStrategyStatus(req.strategy.id, newStatus);

          return {
            ...req,
            resolution,
            resolvedAt: new Date().toLocaleString(),
            comments: newComments,
            strategy: { ...req.strategy, status: newStatus },
          };
        })
      );

      const labels = {
        approved: "Strategy approved",
        "changes-requested": "Changes requested",
        rejected: "Strategy rejected",
      };
      showToast(labels[resolution]);
    },
    [setStrategyStatus, showToast]
  );

  const addComment = useCallback(
    (requestId: string, authorId: PersonaId, content: string) => {
      const author = personas.find((p) => p.id === authorId);
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            comments: [
              ...req.comments,
              {
                id: `comment-${++commentId}`,
                authorId,
                authorName: author?.name || "Unknown",
                content,
                timestamp: new Date().toLocaleString(),
              },
            ],
          };
        })
      );
    },
    []
  );

  const activateStrategy = useCallback(
    (requestId: string) => {
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          setStrategyStatus(req.strategy.id, "active");
          return {
            ...req,
            strategy: { ...req.strategy, status: "active" },
          };
        })
      );
      showToast("Campaign activated");
    },
    [setStrategyStatus, showToast]
  );

  const getPendingForPersona = useCallback(
    (personaId: PersonaId) => {
      // Map persona IDs to approver IDs
      const approverIdMap: Record<string, string> = {
        "marcus-patel": "marcus-patel",
        "jordan-reyes": "jordan-reyes",
      };
      const approverId = approverIdMap[personaId];
      if (!approverId) return [];
      return approvalRequests.filter(
        (req) => req.sentTo === approverId && !req.resolution
      );
    },
    [approvalRequests]
  );

  return (
    <CampaignContext.Provider
      value={{
        activePlan,
        setActivePlan,
        updateSection,
        advertiser,
        setAdvertiser,
        activeStrategy,
        setActiveStrategy,
        activeAudience,
        setActiveAudience,
        savedAudiences,
        saveAudience,
        loadAudience,
        duplicateAudience,
        renameAudience,
        archiveAudience,
        removeAudience,
        approvalRequests,
        sendForApproval,
        resolveApproval,
        addComment,
        activateStrategy,
        getPendingForPersona,
        toast,
        dismissToast,
        showToast,
        savedStrategies,
        savedAdvertisers,
        saveStrategy,
        loadStrategy,
        duplicateStrategy,
        renameStrategy,
        archiveStrategy,
        removeStrategy,
        savedNarratives,
        activeNarrative,
        setActiveNarrative,
        saveNarrative,
        loadNarrative,
        savedBriefs,
        activeBrief,
        setActiveBrief,
        saveBrief,
        loadBrief,
        activeOperator,
        setActiveOperator,
        removeNarrative,
        duplicateNarrative,
        renameNarrative,
        hydrated,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
}
