export const MAJORS: string[] = [
  "Accounting", "Advertising", "Aerospace Engineering", "Anthropology", "Architecture",
  "Biochemistry", "Biology", "Biomedical Engineering", "Business Analytics", "Chemical Engineering",
  "Chemistry", "Civil Engineering", "Classics", "Communication & Leadership", "Computer Science",
  "Corporate Communication", "Economics", "Electrical & Computer Engineering", "English",
  "Environmental Science", "Finance", "Geological Sciences", "Government", "Health & Society",
  "History", "Human Development & Family Sciences", "Human Dimensions of Organizations",
  "International Relations & Global Studies", "Journalism", "Kinesiology", "Linguistics",
  "Management", "Management Information Systems", "Marketing", "Mathematics", "Mechanical Engineering",
  "Microbiology", "Neuroscience", "Nursing", "Nutrition", "Petroleum Engineering", "Pharmacy",
  "Philosophy", "Physics", "Political Communication", "Psychology", "Public Health", "Public Relations",
  "Radio-Television-Film", "Rhetoric & Writing", "Social Work", "Sociology", "Spanish", "Statistics & Data Sciences",
  "Supply Chain Management", "Sustainability Studies", "Textiles & Apparel", "Theatre & Dance", "Undeclared",
  "Other",
];

export const GRAD_YEARS: string[] = ["Class of 2027", "Class of 2028", "Class of 2029", "Class of 2030", "Other"];

/** Map legacy values like "May 2028" onto the class-of options. */
export function normaliseGrad(v: string): string {
  if (GRAD_YEARS.includes(v)) return v;
  const m = v.match(/20(2[7-9]|30)/);
  return m ? `Class of ${m[0]}` : v ? "Other" : "";
}
