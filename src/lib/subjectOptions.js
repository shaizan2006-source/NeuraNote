// src/lib/subjectOptions.js

/**
 * Curated subject options for the AddExamModal dropdown.
 * Keys match the canonical values from SUBJECT_MAP in DashboardContext.
 */
export const SUBJECT_OPTIONS = [
  // CS Core
  { key: "cs",            label: "Computer Science (General)" },
  { key: "dsa",           label: "Data Structures & Algorithms" },
  { key: "dbms",          label: "DBMS" },
  { key: "os",            label: "Operating Systems" },
  { key: "cn",            label: "Computer Networks" },
  { key: "oop",           label: "Object-Oriented Programming" },
  { key: "daa",           label: "Design & Analysis of Algorithms" },
  { key: "se",            label: "Software Engineering" },
  { key: "web",           label: "Web Technologies" },
  { key: "cd",            label: "Compiler Design" },
  { key: "toc",           label: "Theory of Computation" },
  { key: "cloud",         label: "Cloud Computing" },
  { key: "cybersecurity", label: "Cyber Security" },
  { key: "ai",            label: "Artificial Intelligence / ML" },
  // Mathematics
  { key: "math",          label: "Mathematics (General)" },
  { key: "calculus",      label: "Calculus" },
  { key: "linear algebra",label: "Linear Algebra" },
  { key: "discrete math", label: "Discrete Mathematics" },
  { key: "probability",   label: "Probability" },
  { key: "statistics",    label: "Statistics" },
  // Sciences
  { key: "physics",       label: "Physics" },
  { key: "chemistry",     label: "Chemistry" },
  { key: "organic chemistry", label: "Organic Chemistry" },
  { key: "biology",       label: "Biology" },
  // Engineering
  { key: "electrical",    label: "Electrical Engineering" },
  { key: "mechanical",    label: "Mechanical Engineering" },
  { key: "electronics",   label: "Electronics" },
  { key: "vlsi",          label: "VLSI" },
  // Commerce & Business
  { key: "finance",       label: "Finance (General)" },
  { key: "accounting",    label: "Accounting" },
  { key: "economics",     label: "Economics" },
  { key: "business",      label: "Business / MBA" },
  { key: "marketing",     label: "Marketing" },
  { key: "hrm",           label: "Human Resource Management" },
  // Law
  { key: "law",           label: "Law (General)" },
  // Medical
  { key: "medical",       label: "Medical (General)" },
  { key: "anatomy",       label: "Anatomy" },
  { key: "physiology",    label: "Physiology" },
  { key: "pharmacology",  label: "Pharmacology" },
];
