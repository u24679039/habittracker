require("dotenv").config();

const { createAdmin } = require("./authService");
const { prisma } = require("../Server_Back/prisma/client");

async function main() {
  const name = process.env.DEMO_ADMIN_NAME;
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.error(
      "Demo admin environment variables are missing."
    );

    console.error(
      "Set DEMO_ADMIN_NAME, DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD in .env."
    );

    return;
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: email
    },
    select: {
      id: true,
      email: true,
      role: true
    }
  });

  if (existingAdmin) {
    console.log("Demo admin already exists.");
    console.log("Email:", existingAdmin.email);
    console.log("Role:", existingAdmin.role);
    return;
  }

  const result = await createAdmin(
    name,
    email,
    password
  );

  if (result.success) {
    console.log("Demo admin created successfully.");
    console.log("Email:", email);
  } else {
    console.log(result.message);
  }
}

main()
  .catch((error) => {
    console.error(
      "Could not create demo admin:",
      error.message
    );
  })
  .finally(async () => {
    await prisma.$disconnect();
  });