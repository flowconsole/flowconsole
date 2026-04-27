import { FeatureLdg, InfoLdg, TestimonialType } from "types";

export const infos: InfoLdg[] = [
  {
    title: "Empower your projects",
    description:
      "Unlock the full potential of your projects with our open-source platform. Collaborate seamlessly, innovate effortlessly, and scale limitlessly.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "Collaborative",
        description: "Work together with your team members in real-time.",
        icon: "laptop",
      },
      {
        title: "Innovative",
        description: "Stay ahead of the curve with access constant updates.",
        icon: "settings",
      },
      {
        title: "Scalable",
        description:
          "Our platform offers the scalability needed to adapt to your needs.",
        icon: "search",
      },
    ],
  },
  {
    title: "Seamless Integration",
    description:
      "Integrate FlowConsole seamlessly into your existing workflows. Effortlessly connect with your favorite tools and services for a streamlined experience.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "Flexible",
        description:
          "Customize your integrations to fit your unique requirements.",
        icon: "laptop",
      },
      {
        title: "Efficient",
        description: "Streamline your processes and reducing manual effort.",
        icon: "search",
      },
      {
        title: "Reliable",
        description:
          "Rely on our robust infrastructure and comprehensive documentation.",
        icon: "settings",
      },
    ],
  },
];

export const features: FeatureLdg[] = [
  {
    title: "Your Language",
    description:
      "Define your system using you favorite programming language",
    link: "/",
    icon: "gitHub",
  },
  {
    title: "C4 — Evolved",
    description:
      "Built on the proven C4 model, extended with flexibility and modern customization options.",
    link: "/",
    icon: "google",
  },
  {
    title: "Versioned & CI/CD ready",
    description:
      "Git ready! Track diffs & collaborate with familiar developer workflows.",
    link: "/",
    icon: "gitHub",
  },
  {
    title: "Instant Visual Feedback",
    description:
      "See diagrams update as you type — real-time visualization, no manual sync needed.",
    link: "/",
    icon: "laptop",
  },
  {
    title: "Integrate Anywhere",
    description:
      "[Soon] Embed interactive diagrams into docs, websites or apps",
    link: "/",
    icon: "user",
  },
  {
    title: "Be aware of what happening",
    description:
      "[Soon] Track architecture drift and enforce policies and standards within your team or company",
    link: "/",
    icon: "copy",
  },
];

export const testimonials: TestimonialType[] = [
  {
    name: "John Doe",
    job: "Full Stack Developer",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
    review:
      "FlowConsole has truly revolutionized how we document and reason about our system architecture. Diagrams stay in sync with the code, and the DSL feels natural after a few minutes. Highly recommended.",
  },
  {
    name: "Alice Smith",
    job: "UI/UX Designer",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    review:
      "Pairing visual feedback with a typed DSL made it easy to communicate flows and interactions across the design and engineering teams.",
  },
  {
    name: "David Johnson",
    job: "DevOps Engineer",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    review:
      "Architecture-as-code with diff-friendly source files fits naturally into our CI/CD pipeline. Reviewing architecture changes is finally a normal pull-request workflow.",
  },
  {
    name: "Michael Wilson",
    job: "Project Manager",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    review:
      "Clear documentation and a thoughtfully designed model make onboarding new engineers significantly faster.",
  },
  {
    name: "Sophia Garcia",
    job: "Data Analyst",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    review:
      "The graph view turns architectural questions into concrete answers — coupling, dependencies, blast radius — without spinning up custom tooling.",
  },
  {
    name: "Emily Brown",
    job: "Marketing Manager",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    review:
      "Sharing rendered diagrams from a single source of truth has made our customer-facing docs noticeably more accurate.",
  },
  {
    name: "Jason Stan",
    job: "Web Designer",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    review:
      "Live diagram rendering as you type is a small thing that makes a big difference — feedback is immediate, no compile-and-pray cycles.",
  },
];
