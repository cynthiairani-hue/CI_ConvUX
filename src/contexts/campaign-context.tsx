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
} from "@/lib/storage";

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
  savedNarratives: CFONarrative[];
  activeNarrative: CFONarrative | null;
  setActiveNarrative: (narrative: CFONarrative | null) => void;
  saveNarrative: (narrative: CFONarrative) => void;
  loadNarrative: (id: string) => void;
  removeNarrative: (id: string) => void;
  duplicateNarrative: (id: string) => void;
  activeAudience: AudienceSegment | null;
  setActiveAudience: (audience: AudienceSegment | null) => void;
  savedAudiences: AudienceSegment[];
  saveAudience: (audience: AudienceSegment) => void;
  loadAudience: (id: string) => void;
  approvalRequests: ApprovalRequest[];
  sendForApproval: (approverId: string, senderPersonaId: PersonaId) => void;
  resolveApproval: (
    requestId: string,
    resolution: "approved" | "changes-requested" | "rejected",
    comment?: string,
    resolverPersonaId?: PersonaId
  ) => void;
  addComment: (requestId: string, authorId: PersonaId, content: string) => void;
  activatePlan: (requestId: string) => void;
  getPendingForPersona: (personaId: PersonaId) => ApprovalRequest[];
  toast: { message: string; visible: boolean; action?: { label: string; href: string } };
  dismissToast: () => void;
  showToast: (message: string, action?: { label: string; href: string }) => void;
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
    setSavedStrategies(loadStrategies());
    setSavedAdvertisers(loadAdvertisers());
    setSavedNarratives(loadNarratives());
    setSavedAudiences(loadAudiences());
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

  // Persist audiences to localStorage on change
  useEffect(() => {
    if (hydrated) persistAudiences(savedAudiences);
  }, [savedAudiences, hydrated]);

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

  const removeNarrative = useCallback((id: string) => {
    setSavedNarratives((prev) => prev.filter((n) => n.id !== id));
    if (activeNarrative?.id === id) setActiveNarrative(null);
  }, [activeNarrative]);

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

  const sendForApproval = useCallback(
    (approverId: string, senderPersonaId: PersonaId) => {
      if (!activePlan) return;

      const approver = approvers.find((a) => a.id === approverId);
      const sender = personas.find((p) => p.id === senderPersonaId);
      if (!approver || !sender) return;

      const updatedPlan: CampaignPlan = {
        ...activePlan,
        status: "pending-approval",
      };

      const request: ApprovalRequest = {
        id: `approval-${Date.now()}`,
        plan: updatedPlan,
        sentBy: senderPersonaId,
        sentByName: sender.name,
        sentTo: approverId,
        sentToName: approver.name,
        sentAt: new Date().toLocaleString(),
        comments: [],
      };

      setActivePlan(updatedPlan);
      setApprovalRequests((prev) => [...prev, request]);
      showToast(`Sent to ${approver.name} for approval`);
    },
    [activePlan, showToast]
  );

  const resolveApproval = useCallback(
    (
      requestId: string,
      resolution: "approved" | "changes-requested" | "rejected",
      comment?: string,
      resolverPersonaId?: PersonaId
    ) => {
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

          const newStatus =
            resolution === "approved" ? "approved" : "draft";

          return {
            ...req,
            resolution,
            resolvedAt: new Date().toLocaleString(),
            comments: newComments,
            plan: { ...req.plan, status: newStatus as CampaignPlan["status"] },
          };
        })
      );

      // Also update activePlan status
      setActivePlan((prev) => {
        if (!prev) return prev;
        const newStatus =
          resolution === "approved" ? "approved" : "draft";
        return { ...prev, status: newStatus as CampaignPlan["status"] };
      });

      const labels = {
        approved: "Plan approved",
        "changes-requested": "Changes requested",
        rejected: "Plan rejected",
      };
      showToast(labels[resolution]);
    },
    [showToast]
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

  const activatePlan = useCallback(
    (requestId: string) => {
      setApprovalRequests((prev) =>
        prev.map((req) => {
          if (req.id !== requestId) return req;
          return {
            ...req,
            plan: { ...req.plan, status: "activated" },
          };
        })
      );
      setActivePlan((prev) => {
        if (!prev) return prev;
        return { ...prev, status: "activated" };
      });
      showToast("Campaign activated");
    },
    [showToast]
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
        approvalRequests,
        sendForApproval,
        resolveApproval,
        addComment,
        activatePlan,
        getPendingForPersona,
        toast,
        dismissToast,
        showToast,
        savedStrategies,
        savedAdvertisers,
        saveStrategy,
        loadStrategy,
        savedNarratives,
        activeNarrative,
        setActiveNarrative,
        saveNarrative,
        loadNarrative,
        removeNarrative,
        duplicateNarrative,
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
