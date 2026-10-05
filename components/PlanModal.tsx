import React from "react";
import { Modal } from "./Modal";
import { Organization, PlanTier } from "../types";

interface PlanModalProps {
  organization: Organization;
  usageSummary: {
    requestsUsed: number;
    requestLimit: number;
    aiUsed: number;
    aiLimit: number;
  };
  onClose: () => void;
}

const plans: Array<{
  tier: PlanTier;
  price: string;
  summary: string;
  requestLimit: number;
  aiCredits: number;
  features: string[];
}> = [
  {
    tier: "ESSENTIALS",
    price: "$49/mo",
    summary: "Core request workflows for a single care team.",
    requestLimit: 40,
    aiCredits: 0,
    features: [
      "Multi-tenant workspace",
      "Staff request calendar",
      "Admin approvals",
    ],
  },
  {
    tier: "TEAM",
    price: "$149/mo",
    summary:
      "Best for growing clinics that need automation and usage controls.",
    requestLimit: 120,
    aiCredits: 80,
    features: [
      "AI conflict analysis",
      "AI approval messaging",
      "Usage tracking and trials",
    ],
  },
  {
    tier: "BUSINESS",
    price: "$349/mo",
    summary:
      "Scaled operations with higher request throughput and more AI capacity.",
    requestLimit: 500,
    aiCredits: 200,
    features: [
      "Expanded capacity",
      "Priority onboarding",
      "Executive workspace reporting",
    ],
  },
];

export const PlanModal: React.FC<PlanModalProps> = ({
  organization,
  usageSummary,
  onClose,
}) => {
  const upgradeMailTo = `mailto:sales@pulseshift.app?subject=${encodeURIComponent(`PulseShift plan upgrade for ${organization.name}`)}`;

  return (
    <Modal label="Workspace plans" onClose={onClose}>
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl animate-fade-in-up">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-sky-300">
                Billing
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">
                Workspace plan management
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Compare available tiers for {organization.name}, review current
                usage, and choose the right level of automation for your
                staffing team.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
                Current plan
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <h3 className="text-3xl font-extrabold">{organization.plan}</h3>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                  {organization.trialStatus === "ACTIVE"
                    ? `${organization.trialDaysRemaining} days left`
                    : organization.trialStatus === "EXPIRED"
                      ? "Trial expired"
                      : "Live"}
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Requests used:{" "}
                  <strong>
                    {usageSummary.requestsUsed}/{usageSummary.requestLimit}
                  </strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  AI credits used:{" "}
                  <strong>
                    {usageSummary.aiUsed}/{usageSummary.aiLimit}
                  </strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Seats assigned:{" "}
                  <strong>
                    {organization.seats.used}/{organization.seats.total}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                Need a custom rollout?
              </p>
              <p className="mt-2">
                Contact sales for billing automation, SSO, or deployment
                guidance.
              </p>
              <a
                href={upgradeMailTo}
                className="mt-4 inline-flex items-center rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
              >
                Contact sales
              </a>
            </div>
          </aside>

          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.tier === organization.plan;
              return (
                <section
                  key={plan.tier}
                  className={`rounded-3xl border p-5 shadow-sm ${
                    isCurrent
                      ? "border-sky-400 bg-sky-50 shadow-sky-100"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                        {plan.tier}
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold text-slate-950">
                        {plan.price}
                      </h3>
                    </div>
                    {isCurrent && (
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                        Current
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {plan.summary}
                  </p>

                  <div className="mt-5 grid gap-3 text-sm text-slate-700">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      Active request capacity:{" "}
                      <strong>{plan.requestLimit}</strong>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      Lifetime AI allowance: <strong>{plan.aiCredits}</strong>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <i className="fa-solid fa-check mt-1 text-xs text-emerald-500"></i>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href={upgradeMailTo}
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isCurrent
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {isCurrent ? "Manage current plan" : `Request ${plan.tier}`}
                  </a>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
