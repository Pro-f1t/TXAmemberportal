import { displayKeyOk } from "./token";
import { requireStaff } from "@/lib/auth/guard";

/** The live display and its APIs accept either the DISPLAY_KEY (projector laptop) or a signed-in exec. */
export async function displayAllowed(k: string | null | undefined): Promise<boolean> {
  if (displayKeyOk(k)) return true;
  try {
    await requireStaff();
    return true;
  } catch {
    return false;
  }
}
