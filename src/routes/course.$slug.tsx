import { createFileRoute } from "@tanstack/react-router";
import { CoursePage } from "@/components/portal";

export const Route = createFileRoute("/course/$slug")({
  head: ({ params }) => ({ meta: [
    { title: `${params.slug.replaceAll("-", " ")} | SHREE ADS Courses` },
    { name: "description", content: `Explore the ${params.slug.replaceAll("-", " ")} video course from SHREE ADS.` },
    { property: "og:title", content: `${params.slug.replaceAll("-", " ")} | SHREE ADS Courses` },
    { property: "og:description", content: "Course details, UPI payment instructions, and secure lesson access from SHREE ADS." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CourseRoute,
});

function CourseRoute() {
  const { slug } = Route.useParams();
  return <CoursePage slug={slug} />;
}