import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlans, getSubscription, hasFeature, type Plan, type Subscription, type FeatureKey,
} from "@/lib/plan";

interface PlanCtx {
  plan: Plan | null;
  plans: Plan[];
  subscription: Subscription | null;
  can: (feature: FeatureKey) => boolean;
  loading: boolean;
}

const Ctx = createContext<PlanCtx>({ plan: null, plans: [], subscription: null, can: () => true, loading: true });

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { data: plans, isLoading: l1 } = useQuery({ queryKey: ["pm-plans"], queryFn: getPlans, staleTime: 5 * 60_000 });
  const { data: sub, isLoading: l2 } = useQuery({ queryKey: ["pm-subscription"], queryFn: getSubscription, staleTime: 60_000 });

  const plan = (plans ?? []).find((p) => p.code === sub?.plan_code) ?? null;
  const value: PlanCtx = {
    plan, plans: plans ?? [], subscription: sub ?? null,
    can: (f) => hasFeature(plan, f),
    loading: l1 || l2,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const usePlan = () => useContext(Ctx);
