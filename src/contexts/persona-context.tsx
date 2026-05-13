"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { personas } from "@/data/personas";
import type { Persona, PersonaId } from "@/types/persona";

interface PersonaContextValue {
  activePersona: Persona;
  personas: Persona[];
  setActivePersona: (id: PersonaId) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<PersonaId>("cynthia-b2c");

  const activePersona = personas.find((p) => p.id === activeId)!;

  const setActivePersona = useCallback((id: PersonaId) => {
    setActiveId(id);
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
