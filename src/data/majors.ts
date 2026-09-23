// Every undergraduate major on admissions.utexas.edu/explore/colleges-degrees (top-level majors
// and the honors programs students name as their major; specializations are folded into their
// major). Alphabetical, with Undeclared / Other last. Stored on the member as a plain string.
export const MAJORS: string[] = [
  "Accounting", "Acting", "Advertising", "Aerospace Engineering", "Anthropology",
  "Applied Learning and Development", "Architectural Engineering", "Architectural Studies",
  "Architecture", "Art Education", "Art History", "Arts and Entertainment Technologies",
  "Asian American Studies", "Asian Cultures and Languages", "Asian Studies", "Astronomy",
  "Behavioral and Social Data Science", "Biochemistry", "Biology", "Biomedical Engineering",
  "Business Analytics", "Canfield Business Honors", "Chemical Engineering", "Chemistry",
  "Civics Honors", "Civil Engineering", "Classical Languages", "Classical Studies", "Classics",
  "Climate System Science", "Communication and Leadership", "Communication Studies",
  "Computational Engineering", "Computer Science", "Corporate Communication", "Dance", "Design",
  "Economics", "Electrical and Computer Engineering", "English", "Environmental Engineering",
  "Environmental Science", "European Studies", "Finance", "French Studies", "General Geology",
  "Geography", "Geophysics", "Geosciences", "Geosystems Engineering", "German", "Government",
  "Great Books Honors", "Health and Society", "History", "History and Computer Science",
  "Human Development and Family Sciences", "Human Dimensions of Organizations", "Humanities",
  "Hydrology and Water Resources", "Informatics", "Interior Design", "International Business",
  "International Relations and Global Studies", "Italian", "Jazz", "Jewish Studies", "Journalism",
  "Kinesiology and Health", "Latin American Studies", "Linguistics",
  "Linguistics and Computer Science", "Management", "Management Information Systems", "Marketing",
  "Materials Science and Engineering", "Mathematics", "Mechanical Engineering",
  "Medical Laboratory Science", "Middle Eastern Studies", "Music", "Music Composition",
  "Music Education", "Music Performance", "Neuroscience", "Neuroscience and Computer Science",
  "Nursing", "Nutrition", "Petroleum Engineering", "Pharmacy", "Philosophy", "Physics",
  "Plan II Honors", "Pre-Pharmacy", "Psychology", "Public Affairs", "Public Health",
  "Public Relations", "Race, Indigeneity, and Migration", "Radio-Television-Film",
  "Religious Studies", "Rhetoric and Writing", "Russian, East European and Eurasian Studies",
  "Social Work", "Sociology", "Spanish", "Speech, Language, and Hearing Sciences",
  "Statistics and Data Science", "Strategy and Statecraft", "Studio Art",
  "Supply Chain Management", "Sustainability Studies", "Textiles and Apparel", "Theatre and Dance",
  "Theatre Education", "Unspecified Business", "Urban Studies", "Undeclared", "Other",
];

export const GRAD_YEARS: string[] = ["Class of 2027", "Class of 2028", "Class of 2029", "Class of 2030", "Other"];

/** Map legacy values like "May 2028" onto the class-of options. */
export function normaliseGrad(v: string): string {
  if (GRAD_YEARS.includes(v)) return v;
  const m = v.match(/20(2[7-9]|30)/);
  return m ? `Class of ${m[0]}` : v ? "Other" : "";
}
