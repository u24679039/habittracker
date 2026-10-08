# Group 11- Habit Tracker

Note to lecturer:Goodday my Cyclomatic Complexity tables/calculations and informal tests are located in the Individual Demo Testing And Matrics

The team will work in 3 two week sprints from 31/08/2026 to the 14/09/2026 and from the 14/09/2026 to the 28/09/2026 and finally completing the project from 28/09/2026 to the 19/10/2026. 

The work load will be split between the five members as such:

Shahd Ahmed - **Micro-Group & Invite System**

1. FrontEnd: Group creation viww; Join group via invite code view; Group settings & peer list management.
2. BackEnd: Unique invite code generator and validation; Group membership constraints & access control.
3. DB: Group & membership scheme; Group CRUD & Join endpoints.


David Engles (DevOps & scrum Master: manage Git, page speed performance(<2secs), task boards in Jira and perform backlog refinement) - **Habit Management & Streak Engine**

1. FrontEnd: Add/edit/archive habit forms ; Quantitative target inputs(minutes/pages); snooze/rest day UI toggles
2. BackEnd: CRUD business logic for habits; Active streak calculation algorithms; Habit state machine logic.
3. DB: Habit and target scheme; habit status CRUD endpoints; streak logs.

Kiana Faia - **Visual Dashboard & Analytics**

1. FrontEnd: Responsive progress dashboard; habit history & completion charts; PDF/CSV export UI
2. BackEnd: Data aggregation services for metrics; PDF/CSV document generation engine.
3. DB: Analytics endpoints; Historical logging queries; User stats scheme aggregation.


Monal Iyer - **Social Activity Feed & Notifications**
1. FrontEnd: Shared group activity feed UI; Real-time log feed updates; Milestone notification toasts.
2. BackEnd: Group completion feed aggregation; Automated email notification service for milestone accomplishments.
3. DB: Feed activity scheme; Notification queue & event triggers.


Yingisani Mabaso - **Authentication Security and Admin**

1. FrontEnd: Login+Registration; User Profile Settings;Admin Moderation panel
2. BackEnd: JWT authentication & session handling; Bcrypt password hashing; POPIA compliant deletion and security.
3. DB: Admin moderation flags; Auth endpoints; User and roles scheme

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
