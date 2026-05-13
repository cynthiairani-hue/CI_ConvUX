"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { personas } from "@/data/personas";
import type { Persona, PersonaId } from "@/types/persona";

function getInitialPersona(): PersonaId {
  if (typeof window === "undefined") return "cynthia-b2c";
  const stored = localStorage.getItem("fuseiq-persona");
  if (stored && personas.some((p) => p.id === stored)) return stored as PersonaId;
  return "cynthia-b2c";
}

interface PersonaContextValue {
  activePersona: Persona;
  personas: Persona[];
  setActivePersona: (id: PersonaId) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<PersonaId>(getInitialPersona);

  const activePersona = personas.find((p) => p.id === activeId)!;

  const setActivePersona = useCallback((id: PersonaId) => {
    setActiveId(id);
    localStorage.setItem("fuseiq-persona", id);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("fuseiq-persona");
    if (stored && personas.some((p) => p.id === stored)) {
      setActiveId(stored as PersonaId);
    }
  }, []);

  return (
    <PersonaContext.Provider
      value={{ activePersona, personas, setActivePersona }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return context;
}
