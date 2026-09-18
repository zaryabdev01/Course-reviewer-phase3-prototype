import type { Allocation, SeatPool, DevelopmentItem } from "@/contracts";
import { freshFaker, ORG_ACME_ID } from "../seed";
import { masterCourses } from "./courses";
import type { OrgMember } from "@/contracts";

const faker = freshFaker();

export function buildSeatPools(organisationId: string): SeatPool[] {
  const chosen = faker.helpers.arrayElements(masterCourses, 8);
  return chosen.map((c, i) => {
    const purchased = faker.number.int({ min: 20, max: 120 });
    const allocated = faker.number.int({ min: 0, max: purchased });
    const consumed = faker.number.int({ min: 0, max: allocated });
    return {
      id: `seat_${organisationId}_${i}`,
      organisationId,
      masterCourseId: c.id,
      masterCourseTitle: c.title,
      purchased,
      allocated,
      consumed,
      source: faker.helpers.arrayElement(["synced_organisation", "bought", "added"] as const),
    };
  });
}

export function buildAllocations(
  organisationId: string,
  members: OrgMember[],
  count: number,
): Allocation[] {
  const learners = members.filter((m) => m.role === "team_member" && m.status !== "left");
  const allocations: Allocation[] = [];
  for (let i = 0; i < count; i++) {
    const learner = faker.helpers.arrayElement(learners);
    const course = faker.helpers.arrayElement(masterCourses);
    const status = faker.helpers.weightedArrayElement([
      { value: "assigned" as const, weight: 3 },
      { value: "in_progress" as const, weight: 4 },
      { value: "completed" as const, weight: 8 },
      { value: "overdue" as const, weight: 2 },
    ]);
    const deadline = faker.date.soon({ days: 45 }).toISOString().slice(0, 10);
    const allocatedAt = faker.date.past({ years: 1 }).toISOString();
    allocations.push({
      id: `alloc_${organisationId}_${i}`,
      organisationId,
      masterCourseId: course.id,
      masterCourseTitle: course.title,
      targetType: "learner",
      targetId: learner.id,
      targetLabel: learner.fullName,
      formatChoice: faker.helpers.arrayElement(["learner_choice", "fixed"] as const),
      fixedFormat: null,
      deadline,
      appearInMatrix: faker.datatype.boolean({ probability: 0.7 }),
      status,
      progressPercent: status === "completed" ? 100 : status === "assigned" ? 0 : faker.number.int({ min: 5, max: 90 }),
      allocatedAt,
      allocatedBy: "Priya Nair",
      seatConsumed: faker.datatype.boolean({ probability: 0.8 }),
      history: [
        { at: allocatedAt, action: "allocated", by: "Priya Nair" },
        ...(status === "overdue"
          ? [{ at: faker.date.recent({ days: 10 }).toISOString(), action: "reminder_sent" as const, by: "System" }]
          : []),
      ],
    });
  }
  return allocations;
}

export function buildDevelopmentItems(count: number): DevelopmentItem[] {
  const chosen = faker.helpers.arrayElements(masterCourses, count);
  return chosen.map((c, i) => ({
    id: `dev_${i}`,
    masterCourseId: c.id,
    title: c.title,
    source: faker.helpers.arrayElement(["synced_organisation", "bought", "added"] as const),
    sourceLabel: faker.helpers.arrayElement(["Acme Logistics Ltd", "Purchased — Learning Exchange", "Added from Content Library"]),
    addedAt: faker.date.past({ years: 1 }).toISOString(),
    progressPercent: faker.number.int({ min: 0, max: 100 }),
  }));
}

export const acmeSeatPools = () => buildSeatPools(ORG_ACME_ID);
