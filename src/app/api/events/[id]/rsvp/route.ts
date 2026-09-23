import { NextResponse } from "next/server";
import { requireMember, guardErrorStatus } from "@/lib/auth/guard";
import { getEvent, setRsvp } from "@/lib/firebase/portal";
import { visibleTo } from "@/lib/models/Member";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { member } = await requireMember();
    const { id } = await params;
    const body = await request.json();
    const going = body.going === true;
    const event = await getEvent(id);
    if (!event || event.status !== "published" || !visibleTo(event.audienceTeams, member.teams)) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (going && event.capacity !== null && event.rsvpUids.length >= event.capacity && !event.rsvpUids.includes(member.uid)) {
      return NextResponse.json({ error: "This event is full." }, { status: 409 });
    }
    await setRsvp(id, member.uid, going);
    return NextResponse.json({ ok: true, going });
  } catch (error) {
    const status = guardErrorStatus(error) ?? 500;
    return NextResponse.json({ error: "Could not update RSVP." }, { status });
  }
}
