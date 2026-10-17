in Server_Back
Shortcuts
to create GUI to go check backend-DB
npx prisma@7.10.0 studio
to start
in backend terminal 
cd Server_Back
node Habit_Tracker_Logic.js

then in frontend terminal 
cd Client_Front
npm run dev

To Update Git repo on local 
 git fetch origin --prune
 display with 
 git branch -r

 If database(schema.prisma) is ever changed use:

Clear the DB
npx prisma migrate reset 

to update prisma clients
npx prisma generate

!! recreate the DB after clearing 
npx prisma db push

to download necassary npm packages on seperate pc 
in Client_Front
npm ci
npm run build
in Server_Back
npm ci 
npm prisma generate


To seed the DB 
node ./prisma/seed.js 
or 
npx prisma db seed