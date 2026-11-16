import React, { useState } from "react";
import { PulseMark, NavIcon } from "./PulseBrand";
import "../homepage.css";

type Preview = "PLAN" | "RESPONSE" | "TIME";
function ProductExample() {
  const [preview, setPreview] = useState<Preview>("PLAN");
  const [accepted, setAccepted] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [approved, setApproved] = useState(false);
  const reset = () => {
    setPreview("PLAN");
    setAccepted(false);
    setRecorded(false);
    setApproved(false);
  };
  return (
    <div className="product-example">
      <div
        className="example-tabs"
        role="group"
        aria-label="Explore the example workflow"
      >
        {(
          [
            ["PLAN", "01", "Make the plan"],
            ["RESPONSE", "02", "Get a response"],
            ["TIME", "03", "Follow the hours"],
          ] as const
        ).map(([id, number, label]) => (
          <button
            key={id}
            aria-pressed={preview === id}
            aria-label={label}
            onClick={() => setPreview(id)}
          >
            <span>{number}</span>
            {label}
            <span className="example-tab-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
      <div className="example-window">
        <div className="example-window-bar">
          <div className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>
            Sample clinic <span>/</span>{" "}
            {preview === "PLAN"
              ? "Shift planner"
              : preview === "RESPONSE"
                ? "My assignments"
                : "Team time"}
          </span>
          <span className="sample-label">EXAMPLE DATA</span>
        </div>
        <div className="example-content">
          <div className="example-screen">
            <div className="example-screen-heading">
              <div>
                <span className="home-label">
                  {preview === "PLAN" ? "GENERAL WARD" : "MONDAY, 16 NOVEMBER"}
                </span>
                <h3>
                  {preview === "PLAN"
                    ? "A week with a plan."
                    : preview === "RESPONSE"
                      ? "Alex’s next assignment"
                      : "Assignment & attendance"}
                </h3>
              </div>
              <span className="example-week">16–20 Nov</span>
            </div>
            {preview === "PLAN" ? (
              <div
                className="sample-roster"
                role="table"
                aria-label="Example weekly staff schedule"
              >
                <div className="roster-row roster-head" role="row">
                  <span role="columnheader">Team member</span>
                  {["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"].map(
                    (d) => (
                      <span key={d} role="columnheader">
                        {d}
                      </span>
                    ),
                  )}
                </div>
                {[
                  {
                    name: "Alex Morgan",
                    role: "Nurse",
                    initials: "AM",
                    shifts: [
                      "Morning",
                      "Morning",
                      "Day off",
                      "Morning",
                      "Morning",
                    ],
                  },
                  {
                    name: "Jamie Patel",
                    role: "Nurse",
                    initials: "JP",
                    shifts: ["Late", "Day off", "Late", "Late", "Late"],
                  },
                  {
                    name: "Sam Rivers",
                    role: "Supervisor",
                    initials: "SR",
                    shifts: [
                      "Morning",
                      "Morning",
                      "Morning",
                      "Day off",
                      "Morning",
                    ],
                  },
                ].map((person, i) => (
                  <div className="roster-row" role="row" key={person.name}>
                    <div className="roster-person" role="cell">
                      <span className={`sample-avatar avatar-${i}`}>
                        {person.initials}
                      </span>
                      <span>
                        <strong>{person.name}</strong>
                        <small>{person.role}</small>
                      </span>
                    </div>
                    {person.shifts.map((shift, day) => (
                      <div role="cell" key={day}>
                        {shift === "Day off" ? (
                          <span className="roster-off">Day off</span>
                        ) : (
                          <div
                            className={`roster-shift ${shift === "Late" ? "shift-late" : ""}`}
                          >
                            <b>{shift}</b>
                            <small>
                              {shift === "Late"
                                ? "12:00 – 20:00"
                                : "08:00 – 16:00"}
                            </small>
                            <span>
                              {day === 0 && i === 0
                                ? "30 min break"
                                : "Assigned"}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : preview === "RESPONSE" ? (
              <div className="sample-assignment">
                <div className="sample-person-heading">
                  <span className="sample-avatar avatar-0">AM</span>
                  <span>
                    Alex Morgan<small>Nurse · General ward</small>
                  </span>
                  <span
                    className={`example-badge ${accepted ? "is-confirmed" : ""}`}
                  >
                    {accepted ? "Accepted" : "Response needed"}
                  </span>
                </div>
                <h4>Morning shift</h4>
                <p>Monday 16 November · Main clinic</p>
                <div className="sample-time-range">
                  <span>
                    08:00<small>START</small>
                  </span>
                  <span aria-hidden="true">⟶</span>
                  <span>
                    16:00<small>FINISH</small>
                  </span>
                </div>
                <p className="sample-break">
                  30-minute scheduled break · 7.5 planned hours
                </p>
                <div className="example-response-note" role="status">
                  {accepted
                    ? "Alex has confirmed this assignment. Attendance hasn’t been recorded yet."
                    : "A published shift is a request to work. Alex can review it before responding."}
                </div>
              </div>
            ) : (
              <div className="sample-timesheet">
                <div className="sample-person-heading">
                  <span className="sample-avatar avatar-0">AM</span>
                  <span>
                    Alex Morgan<small>Morning shift · General ward</small>
                  </span>
                  <span
                    className={`example-badge ${accepted ? "is-confirmed" : ""}`}
                  >
                    {accepted ? "Accepted" : "Not yet accepted"}
                  </span>
                </div>
                <div className="sample-attendance-grid">
                  <div>
                    <small>CLOCK-IN</small>
                    <strong>{recorded ? "08:02" : "Not recorded"}</strong>
                  </div>
                  <div>
                    <small>CLOCK-OUT</small>
                    <strong>{recorded ? "16:02" : "Not recorded"}</strong>
                  </div>
                  <div>
                    <small>RECORDED HOURS</small>
                    <strong>{recorded ? "7.5h" : "—"}</strong>
                  </div>
                  <div>
                    <small>TIME APPROVAL</small>
                    <strong className={approved ? "approved-example" : ""}>
                      {approved
                        ? "Approved"
                        : recorded
                          ? "Awaiting review"
                          : "No time submitted"}
                    </strong>
                  </div>
                </div>
                <p className="example-response-note" role="status">
                  {approved
                    ? "7.5 recorded hours approved by the example manager. The 30-minute break is excluded."
                    : recorded
                      ? "Example attendance: 08:02–16:02, less a 30-minute break. A manager still needs to review it."
                      : "Accepting an assignment confirms the plan. Clock-in and clock-out are separate records."}
                </p>
              </div>
            )}
          </div>
          <aside
            className="example-explanation"
            aria-label="About this example"
          >
            <span className="home-label">
              {preview === "PLAN"
                ? "BEFORE YOU PUBLISH"
                : preview === "RESPONSE"
                  ? "AFTER YOU PUBLISH"
                  : "AFTER THE SHIFT"}
            </span>
            <h3>
              {preview === "PLAN"
                ? "A name in every slot. A reason behind it."
                : preview === "RESPONSE"
                  ? "Assigned doesn’t mean confirmed."
                  : "Accepted doesn’t mean worked."}
            </h3>
            <p>
              {preview === "PLAN"
                ? "In your workspace, eligible roles, overlaps, and configured working limits are checked before a draft can go live."
                : preview === "RESPONSE"
                  ? "Staff see the published assignment and choose whether to accept. Managers can follow the response."
                  : "Keep scheduled hours, recorded attendance, and reviewed time separate. No clock-in? The app says so."}
            </p>
            {preview === "PLAN" ? (
              <button
                onClick={() => setPreview("RESPONSE")}
                className="home-primary"
              >
                Publish example <span aria-hidden="true">→</span>
              </button>
            ) : preview === "RESPONSE" ? (
              <button
                onClick={() => {
                  if (!accepted) setAccepted(true);
                  else setPreview("TIME");
                }}
                className="home-primary"
              >
                {accepted
                  ? "View example attendance"
                  : "Accept example assignment"}
                <span aria-hidden="true">→</span>
              </button>
            ) : !accepted ? (
              <button
                onClick={() => setPreview("RESPONSE")}
                className="home-primary"
              >
                Accept the example first <span aria-hidden="true">→</span>
              </button>
            ) : !recorded ? (
              <button
                onClick={() => setRecorded(true)}
                className="home-primary"
              >
                Record example time <span aria-hidden="true">→</span>
              </button>
            ) : !approved ? (
              <button
                onClick={() => setApproved(true)}
                className="home-primary"
              >
                Approve example time <span aria-hidden="true">✓</span>
              </button>
            ) : (
              <div className="example-complete">
                <span>✓</span> From plan to approved time.
              </div>
            )}
            <p className="example-disclaimer">
              An interactive example. Nothing here changes a real schedule.
            </p>
            <button className="reset-example" onClick={reset}>
              Reset example <span aria-hidden="true">↺</span>
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({
  children,
  onGetStarted,
}: {
  children: React.ReactNode;
  onGetStarted: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const start = () => {
    onGetStarted();
    document.getElementById("signin")?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };
  return (
    <div
      className={`editorial-home ${paused ? "home-motion-paused" : ""}`}
      id="home"
    >
      <header className="home-navigation">
        <a className="brand-lockup" href="#home">
          <PulseMark />
          <span>
            PulseShift<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Website navigation">
          <a href="#features">The product</a>
          <a href="#how-it-works">Getting started</a>
          <a href="#about">Why PulseShift</a>
        </nav>
        <div className="home-nav-actions">
          <a href="#signin">
            Log in <span aria-hidden="true">↗</span>
          </a>
          <button className="home-primary" onClick={start}>
            Get started <span aria-hidden="true">→</span>
          </button>
        </div>
      </header>
      <main>
        <section className="human-hero">
          <div className="human-hero-copy">
            <div className="home-label hero-label">
              <span className="status-dot" /> HEALTHCARE TEAMS. REAL WORKING
              DAYS.
            </div>
            <h1>
              The shift starts
              <br />
              <em>before</em> 8am<span className="hero-full-stop">.</span>
            </h1>
            <p>
              Build the rota. Know who’s confirmed. Follow the hours actually
              worked. One workspace for the work behind every shift.
            </p>
            <div className="hero-actions">
              <button className="home-primary" onClick={start}>
                Plan your next week <span aria-hidden="true">↗</span>
              </button>
              <a href="#features" className="home-text-link">
                <span className="play-example" aria-hidden="true">
                  ▷
                </span>
                Try the product
              </a>
            </div>
            <div className="hero-bottom-note">
              <span className="note-rule" />
              <p>
                For the manager planning next week.
                <br />
                For the nurse checking tomorrow.
              </p>
            </div>
          </div>
          <figure className="human-hero-image">
            <img
              src="/images/pulseshift-clinicians.jpg"
              alt="Two healthcare professionals in scrubs and a white coat sharing a moment together"
              width="1200"
              height="800"
              fetchPriority="high"
            />
            <div className="hero-photo-shade" />
            <figcaption>
              <span className="photo-note-number">01 / PEOPLE FIRST</span>
              <p>
                There’s a person
                <br />
                behind every shift.
              </p>
            </figcaption>
            <div className="hero-shift-slip">
              <span className="slip-pin" />
              <span className="home-label">SAMPLE SHIFT / A CLEARER START</span>
              <strong>Morning shift</strong>
              <p>
                General ward <span>08:00 — 16:00</span>
              </p>
              <a href="#features">
                See how the plan comes together{" "}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </figure>
        </section>
        <div className="home-caption-line">
          <span>Scheduling, with the whole working day in view.</span>
          <button onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? "Resume motion" : "Pause motion"}{" "}
            <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
          </button>
        </div>
        <section className="product-story" id="features">
          <header className="product-story-heading">
            <div>
              <span className="home-label">TAKE A LOOK INSIDE</span>
              <h2>
                A schedule is only
                <br />
                the beginning.
              </h2>
            </div>
            <p>
              Publishing is one step. Knowing who accepted—and who actually
              worked—is the rest of the story. Try it below.
            </p>
          </header>
          <ProductExample />
        </section>
        <section className="home-start-guide" id="how-it-works">
          <div>
            <span className="home-label">YOUR FIRST WORKING WEEK</span>
            <h2>
              Start small.
              <br />
              Get the week sorted.
            </h2>
          </div>
          <ol>
            {[
              [
                "Bring your people in",
                "Create your workspace and share invitation links with your team.",
              ],
              [
                "Give the week a shape",
                "Set eligible roles, add shifts, and work through conflicts before publishing.",
              ],
              [
                "Keep the day moving",
                "Follow responses, handle leave, and review the time your team records.",
              ],
            ].map(([title, copy], i) => (
              <li key={title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="home-access" id="signin">
          <div className="access-copy">
            <span className="home-label">YOUR WORKSPACE IS HERE</span>
            <h2>
              Less chasing.
              <br />
              More{" "}
              <em>
                “see you
                <br />
                on shift.”
              </em>
            </h2>
            <p>
              Already part of a team? Sign in to see your schedule.
              <br />
              Starting something new? Create a workspace and invite your people.
            </p>
            <div className="access-detail">
              <NavIcon name="SCHEDULE" />
              <span>Your schedule</span>
              <NavIcon name="TEAM" />
              <span>Your team</span>
              <NavIcon name="REPORTS" />
              <span>Your hours</span>
            </div>
          </div>
          <div className="human-auth-panel">
            <div className="auth-panel-label">
              <PulseMark />
              <span>PULSESHIFT WORKSPACE</span>
              <span className="status-dot" />
            </div>
            {children}
          </div>
        </section>
        <section className="human-about" id="about">
          <figure>
            <img
              src="/images/pulseshift-care-team.jpg"
              alt="A group of nurses and doctors standing together in a hospital corridor"
              width="1400"
              height="933"
              loading="lazy"
            />
            <figcaption>Different roles. One working day.</figcaption>
          </figure>
          <div className="human-about-copy">
            <span className="home-label">WHY WE’RE BUILDING PULSESHIFT</span>
            <h2>
              The plan should
              <br />
              work for the people
              <br />
              <em>doing the work.</em>
            </h2>
            <p>
              A leave request in one place. A rota in another. A message asking
              who can cover. Then the question at the end of the week: which
              hours were actually worked?
            </p>
            <p>
              PulseShift connects those moments. A manager can follow an
              assignment from draft to approved time. A team member can see
              what’s next and respond without chasing the plan.
            </p>
            <a className="home-text-link" href="#features">
              See the working day, connected <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <section className="human-faq">
          <div>
            <span className="home-label">BEFORE YOU GET STARTED</span>
            <h2>
              A few fair
              <br />
              questions.
            </h2>
            <p>
              Something worth knowing before
              <br />
              you plan your first week.
            </p>
          </div>
          <div>
            {[
              [
                "Is PulseShift for managers or staff?",
                "Both. Managers plan and publish shifts, handle requests, and review time. Staff view their assignments, accept or decline, request leave, and record attendance.",
              ],
              [
                "Does accepting a shift mean it was worked?",
                "No. Acceptance confirms the plan. Clock-in and clock-out record attendance. A separate approval shows that a manager has reviewed that time.",
              ],
              [
                "How do I join my team?",
                "Open the invitation link your manager shares and register or sign in with the exact email address they invited.",
              ],
              [
                "Can I see the product before creating an account?",
                "Yes. Use the interactive example above to follow a shift from planning to acceptance and approved time. It uses example data and does not change a real schedule.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="human-last-call">
          <div className="last-call-mark" aria-hidden="true">
            <PulseMark />
          </div>
          <div>
            <span className="home-label">
              LET’S PUT NEXT WEEK ON THE CALENDAR
            </span>
            <h2>
              Your people.
              <br />A better plan.
            </h2>
          </div>
          <button className="home-primary" onClick={start}>
            Create your workspace <span aria-hidden="true">↗</span>
          </button>
        </section>
      </main>
      <footer className="human-footer">
        <div className="footer-top">
          <a className="brand-lockup" href="#home">
            <PulseMark />
            <span>PulseShift.</span>
          </a>
          <p>For the people behind every shift.</p>
          <nav aria-label="Footer navigation">
            <a href="#features">The product</a>
            <a href="#about">About</a>
            <a href="#signin">Log in</a>
            <a href="#how-it-works">Getting started</a>
          </nav>
        </div>
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} PulseShift</small>
          <span>
            Photography:{" "}
            <a
              href="https://www.pexels.com/photo/woman-in-blue-scrub-suit-standing-beside-a-man-in-white-laboratory-gown-5722158/"
              target="_blank"
              rel="noreferrer"
            >
              cottonbro studio
            </a>{" "}
            &{" "}
            <a
              href="https://www.pexels.com/photo/doctors-and-nurses-in-a-hospital-6129502/"
              target="_blank"
              rel="noreferrer"
            >
              RDNE Stock project
            </a>{" "}
            / Pexels
          </span>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
