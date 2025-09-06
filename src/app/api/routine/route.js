// app/api/routine/route.js (App Router)
import { auth } from "@/auth";
import { sql } from "@/lib/pgdb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Get authenticated user session
    const session = await auth();
    console.log("Routine List API accessed by:", session?.user?.email);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all routines for the current user
    const result = await sql`
      SELECT routineID, routineStr, email
      FROM savedroutine 
      WHERE email = ${session.user.email}
      ORDER BY routineID DESC
    `;

    return NextResponse.json({
      success: true,
      routines: result.map(routine => ({
        id: routine.routineid,
        routineStr: routine.routinestr,
        email: routine.email
      }))
    });

  } catch (error) {
    console.error("Error fetching routines:", error);
    return NextResponse.json(
      { error: "Failed to fetch routines" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Get authenticated user session
    const session = await auth();
    console.log("Routine Save API accessed by:", session?.user?.email);
    if (!session || !session.user?.email) {

          return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
    }

    const { routineStr, email } = await request.json();

    if (email !== session.user.email) {
      return NextResponse.json(
        { error: "Email mismatch" },
        { status: 403 }
      );
    }

    // Save to database
    const result = await sql`
      INSERT INTO savedroutine (routineStr, email)
      VALUES (${routineStr}, ${session.user.email})
      RETURNING routineID
    `;

    return NextResponse.json({ 
      success: true, 
      routineId: result[0].routineid 
    });

  } catch (error) {
    console.error("Error saving routine:", error);
    return NextResponse.json(
      { error: "Failed to save routine" },
      { status: 500 }
    );
  }
}