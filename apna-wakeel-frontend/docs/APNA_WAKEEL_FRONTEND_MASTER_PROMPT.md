MASTER PROMPT — APNA WAKEEL COMPLETE FRONTEND

Exact master prompt copied from the provided source document.

MASTER PROMPT — APNA WAKEEL COMPLETE FRONTEND


ROLE

You are a senior React frontend engineer, UI/UX designer, and product architect.


You are helping us build the frontend of:


                    APNA WAKEEL


Apna Wakeel is a user-friendly AI-powered legal navigation web application for Pakistan.


IMPORTANT:

This is NOT a generic AI chatbot and it must NOT look like a random ChatGPT clone.


The interface may be inspired by the usability and conversational structure of ChatGPT, but Apna Wakeel must have its own authentic identity, professional legal/government-style visual language, and Pakistan-focused purpose.


============================================================

1. PROJECT GOAL

============================================================


Build the COMPLETE FRONTEND of Apna Wakeel.


The application should allow a user to:


• create an account

• log in

• securely access their account

• start a new legal conversation

• continue previous conversations

• type their legal problem

• use voice input

• have a two-way voice conversation

• upload/share legal documents

• receive AI responses in text

• optionally receive AI responses through voice

• switch between English, Urdu, and Roman Urdu

• switch between light and dark themes

• access settings

• manage their interface preferences

• navigate smoothly between Chat, Voice, Documents, and Settings


The frontend must be designed so that the backend and AI agents can be connected later.


============================================================

2. VERY IMPORTANT ARCHITECTURE

============================================================


The frontend is ONLY responsible for:


• UI

• UX

• navigation

• authentication interface

• collecting user input

• displaying conversations

• displaying uploaded documents

• voice interface

• language selection

• theme selection

• communicating with backend APIs

• displaying backend responses


The frontend must NOT perform legal reasoning itself.


The frontend must NOT contain fake legal answers.


The frontend must NOT contain hard-coded AI responses pretending to come from an agent.


The frontend must NOT contain secret API keys.


The backend will later communicate with our AI agents.


Architecture:


USER

  ↓

REACT FRONTEND

  ↓

BACKEND API

  ↓

AI AGENTS

  ↓

BACKEND

  ↓

REACT FRONTEND

  ↓

USER


Keep this separation clean.


============================================================

3. TECHNOLOGY

============================================================


Use:


• React

• Vite

• JavaScript

• HTML

• CSS

• React hooks

• Supabase client for authentication/database integration where appropriate


I already know:


• HTML

• CSS

• JavaScript

• basic React


Therefore:


DO NOT unnecessarily introduce extremely complicated technologies.


Use clean, readable, maintainable React.


If another package is genuinely necessary, explain why before introducing unnecessary complexity.


============================================================

4. APPLICATION STRUCTURE

============================================================


The application should have these major areas:


PUBLIC AREA:


1. Landing page

2. Sign Up

3. Login


AUTHENTICATED AREA:


4. Dashboard / Chat

5. Voice

6. Documents

7. Settings


The navigation should actually work.


Do NOT create buttons that only look clickable.


============================================================

5. SIGN-UP PAGE

============================================================


Create a professional, simple Sign Up page.


Include:


• Name

• Email

• Password

• Confirm password

• Sign Up button

• Login link

• appropriate validation

• loading state

• error state

• success state


Use Supabase Authentication for account creation.


Do not store passwords manually.


Do not create a fake authentication system.


Use Supabase Auth properly.


After successful registration:


→ authenticate the user

→ create/access the user's profile if required

→ redirect to the authenticated dashboard


Handle:


• invalid email

• weak password

• existing account

• network failure

• Supabase errors


with understandable messages.


============================================================

6. LOGIN PAGE

============================================================


Create a professional Login page.


Include:


• Email

• Password

• Login button

• Sign Up link

• Forgot password option if appropriate

• loading state

• error handling


Use Supabase Authentication.


After successful login:


→ obtain authenticated session

→ redirect to Dashboard


If the user is already authenticated, do not unnecessarily show the login page.


============================================================

7. SUPABASE

============================================================


Use Supabase for authentication and user-related data where appropriate.


Create a clean configuration such as:


src/

  lib/

    supabase.js


Use environment variables.


Example:


VITE_SUPABASE_URL=

VITE_SUPABASE_ANON_KEY=


IMPORTANT:


Never put service-role keys or private backend secrets inside the React application.


Only public client-side Supabase credentials may be used in the frontend.


Explain where the environment variables should be placed.


============================================================

8. AUTHENTICATION STATE

============================================================


The application must know whether the user is:


• loading authentication state

• authenticated

• unauthenticated


Use an appropriate React authentication/context structure.


Conceptually:


AuthProvider

    ↓

currentUser

    ↓

Protected Routes

    ↓

Dashboard


Unauthenticated user:


→ Login / Sign Up


Authenticated user:


→ Dashboard


Do not rely only on localStorage to pretend someone is logged in.


Use the Supabase authentication session.


============================================================

9. DASHBOARD

============================================================


After login, the user enters the main Apna Wakeel dashboard.


The overall experience should feel familiar and easy like a modern conversational AI application.


However:


DO NOT copy ChatGPT's branding or exact UI.


Create an original Apna Wakeel interface.


Suggested structure:


--------------------------------------------------

| Sidebar                 | Main Chat Area        |

|                         |                       |

| + New Chat              | Header               |

| Recent Conversations    |                       |

|                         | Conversation         |

| Chat                    | messages             |

| Voice                   |                       |

| Documents               |                       |

| Settings                |                       |

|                         |                       |

| User Profile            | Input area           |

--------------------------------------------------


Adapt this structure intelligently to desktop and mobile.


============================================================

10. SIDEBAR

============================================================


The sidebar should contain:


• Apna Wakeel logo

• New Chat

• Recent conversations

• Chat

• Voice

• Documents

• Settings

• user profile/logout


The sidebar must actually navigate.


If the user clicks:


CHAT

→ open Chat interface


VOICE

→ open Voice interface


DOCUMENTS

→ open Documents interface


SETTINGS

→ open Settings interface


Do not reload the entire application unnecessarily.


Use appropriate React routing or a clean navigation architecture.


============================================================

11. NEW CHAT

============================================================


The user should be able to click:


+ New Chat


This should create a fresh conversation state.


Important:


Starting a new chat must NOT reuse the previous conversation's:


• messages

• documents

• loading state

• AI response

• case information


The frontend should prepare a clean conversation.


The backend can later provide the actual conversation ID.


Design the frontend so it can support:


conversation_id


or


session_id


from the backend.


============================================================

12. CHAT INTERFACE

============================================================


This is the most important part of the frontend.


The center of the dashboard should be a conversational interface.


The user should be able to write naturally.


Example:


"My employer has not paid my salary for three months."


The user should NOT be forced through a rigid questionnaire.


The conversation should feel natural.


The frontend should display:


USER MESSAGE


AI RESPONSE


USER MESSAGE


AI RESPONSE


etc.


The frontend must support:


• text messages

• loading indicator

• errors

• timestamps if appropriate

• message history

• scrolling

• sending

• disabled state while processing

• retry option when appropriate


Do NOT hard-code legal answers.


The AI response will eventually come from the backend.


============================================================

13. CHAT INPUT

============================================================


Create a modern chat input area.


It should support:


• text input

• send button

• attachment button

• voice button


Conceptually:


[ + / Attach ] [ Type your legal problem... ] [ 🎤 ] [ Send ]


The input should be comfortable on mobile.


Enter:


→ send message


Shift + Enter:


→ new line


Do not make the input unnecessarily complicated.


============================================================

14. VOICE INPUT — ONE-WAY

============================================================


We want a feature where:


USER SPEAKS

↓

Speech-to-text

↓

recognized text appears in input

↓

user can review/edit it

↓

send

↓

backend

↓

AI response

↓

text response


This is extremely important:


Voice input must eventually use the SAME chat/backend pipeline as typed input.


Do NOT create a completely separate legal reasoning system for voice.


Architecture:


Typed:


Text

↓

Chat API


Voice:


Voice

↓

Speech-to-text

↓

Text

↓

Chat API


The user must be able to see and edit the recognized text before sending it.


Support:


• English

• Urdu


If browser speech recognition has limitations, handle them gracefully.


Do not pretend unsupported browser functionality is working.


============================================================

15. TWO-WAY VOICE CONVERSATION

============================================================


We also want a conversational voice mode.


Concept:


USER SPEAKS

↓

Speech-to-text

↓

Backend

↓

AI

↓

Text response

↓

Text-to-speech

↓

USER HEARS RESPONSE


This should feel like a natural conversation.


Create a dedicated Voice interface.


Include:


• microphone button

• listening indicator

• speaking indicator

• transcript

• stop button

• mute/volume control if appropriate

• language selector

• conversation history

• exit voice mode


Languages:


• English

• Urdu


Roman Urdu should also be supported as a language/output preference where appropriate.


IMPORTANT:


The frontend should be architected so the actual speech services can be connected by the backend later.


Do not hard-code fake AI voice responses.


============================================================

16. LANGUAGES

============================================================


Apna Wakeel must support:


1. English

2. اردو

3. Roman Urdu


The language selector should be easily accessible.


Example:


EN

اردو

Roman Urdu


The selected language should affect:


• UI labels where translations are available

• user input

• AI response preference

• voice language where supported


Urdu interface must support RTL layout.


When Urdu is selected:


direction:

rtl


When English/Roman Urdu:


direction:

ltr


Do not merely translate a few buttons.


Create a clean localization structure.


For example:


src/

  i18n/

    en.js

    ur.js

    romanUrdu.js


Do not scatter text throughout components unnecessarily.


============================================================

17. ROMAN URDU

============================================================


Roman Urdu is explicitly required.


Example:


"mera landlord mujhe security deposit wapas nahi de raha"


The interface must allow this naturally.


Do not force users to use Urdu script.


The AI response language preference should be passed to the backend.


Example:


language: "roman_urdu"


============================================================

18. DOCUMENTS

============================================================


Create a Documents section.


The user should be able to:


• upload documents

• see uploaded documents

• view file name

• file type

• file size

• upload status

• remove/delete where appropriate

• select a document for a conversation

• see processing status


Potential document types:


• PDF

• DOC/DOCX

• images

• other supported legal documents


Do not pretend the backend has processed a document if it has not.


Use clear states:


Uploading...

Uploaded

Processing...

Ready

Failed


The actual document analysis will eventually happen on the backend.


============================================================

19. DOCUMENT ATTACHMENT IN CHAT

============================================================


The chat input should have an attachment button.


Example:


+


When clicked:


→ file picker


After selecting:


show attachment preview:


[document.pdf]

[remove]


Then:


USER MESSAGE

+

DOCUMENT


will be sent through the backend API.


Design the frontend so the backend can receive:


conversation_id

message

document_ids


or the actual API structure provided later.


Do not invent a backend implementation.


============================================================

20. SETTINGS

============================================================


When the user clicks Settings:


→ open a complete Settings page/panel.


Settings should include sections such as:


ACCOUNT

• Name

• Email

• Profile information


PREFERENCES

• Language

• Response language

• Theme


VOICE

• Voice language

• voice preferences


PRIVACY

• conversation/data information

• document information


ACCOUNT ACTIONS

• Logout

• delete account if backend supports it


The settings page should be genuinely functional where possible.


============================================================

21. SETTINGS NAVIGATION

============================================================


This is important.


If the user is in:


Settings


and clicks:


Chat


→ Chat opens.


If user clicks:


Voice


→ Voice opens.


If user clicks:


Documents


→ Documents opens.


Navigation should remain consistent throughout the application.


Do not make separate disconnected pages.


============================================================

22. LIGHT / DARK MODE

============================================================


Include a light/dark theme toggle.


The theme should be:


• professional

• comfortable

• modern

• accessible


Do not use excessive colors.


Avoid childish gradients.


Avoid neon colors.


Avoid overly saturated backgrounds.


Persist the user's theme preference where appropriate.


Respect system preference initially if appropriate.


============================================================

23. VISUAL IDENTITY

============================================================


Apna Wakeel is a Pakistani legal navigation platform.


The design should communicate:


• trust

• legality

• professionalism

• simplicity

• accessibility

• modern technology


The user specifically prefers simplicity.


Do NOT make the interface:


• childish

• overly colorful

• overly decorative

• crowded

• old-fashioned

• visually noisy


Use a restrained professional palette.


The logo and provided visual assets should be treated as the primary visual identity.


If logo/background assets are provided in the project, USE THEM.


Do not replace them with random generated imagery.


============================================================

24. COVER / HERO IMAGE

============================================================


If a cover/hero image is provided:


Use it primarily for:


• landing page

• login/sign-up visual area

• appropriate hero section


Do NOT automatically make it the background of the entire application.


If used behind content:


• keep it subtle

• use an appropriate overlay

• preserve visibility

• maintain readability


The authenticated dashboard should remain clean and focused on the conversation.


============================================================

25. LOGO

============================================================


Use the provided Apna Wakeel logo.


The logo should appear in:


• landing page

• login/sign-up

• dashboard sidebar/header where appropriate

• loading/splash states if useful


Do not distort the logo.


Maintain proper proportions.


============================================================

26. RESPONSIVE DESIGN

============================================================


The application MUST work on:


• desktop

• laptop

• tablet

• mobile


On mobile:


The sidebar should become a drawer/menu.


The chat should occupy the available width.


The input should remain usable.


Buttons should be touch-friendly.


Voice controls should be easy to access.


Documents should not overflow horizontally.


============================================================

27. ACCESSIBILITY

============================================================


Follow basic accessibility principles.


Include:


• proper labels

• keyboard navigation

• focus states

• sufficient contrast

• accessible buttons

• aria-labels where appropriate

• readable typography

• clear error messages


Do not sacrifice usability for aesthetics.


============================================================

28. FRONTEND API ARCHITECTURE

============================================================


Create a clean service layer.


For example:


src/

  services/

    api.js

    auth.js

    chat.js

    documents.js

    voice.js


But do not unnecessarily split files if the project would become more complicated.


The key principle:


Components

↓

Service layer

↓

Backend API


NOT:


Component

↓

random fetch()

↓

another component

↓

hard-coded endpoint


Centralize API communication.


============================================================

29. BACKEND PLACEHOLDERS

============================================================


The backend/AI agent implementation is being developed separately.


Therefore, create clean API functions/interfaces that can later connect to it.


For example:


sendMessage()


createConversation()


getConversations()


getConversation()


uploadDocument()


getDocuments()


sendVoiceTranscript()


getAIResponse()


Do NOT fabricate successful AI responses.


If an endpoint does not exist yet:


show a clear development placeholder/error.


Do not use fake legal answers.


============================================================

30. CONVERSATION HISTORY

============================================================


The sidebar should show recent conversations.


Each conversation may contain:


• title

• date/time

• last message preview


Example:


Recent conversations


Unpaid salary

Security deposit issue

Online blackmail

Property dispute


Clicking a conversation should open that conversation.


The actual conversation data will eventually come from Supabase/backend.


Do not hard-code fake conversations as the final implementation.


If temporary mock data is necessary during development, clearly isolate it and make it easy to remove.


============================================================

31. CONVERSATION TITLE

============================================================


New conversations can initially have a temporary title such as:


New conversation


Later the backend may generate a meaningful title.


Design the frontend so the title can be updated by the backend.


============================================================

32. SECURITY

============================================================


Never place:


• AI API keys

• service role keys

• private backend credentials

• secret tokens


inside frontend code.


Never use:


VITE_SECRET_KEY


for actual private secrets.


The frontend should only communicate with the backend using safe client-facing endpoints.


Supabase service-role credentials must NEVER be exposed in React.


============================================================

33. ERROR HANDLING

============================================================


Every important operation must have:


LOADING

SUCCESS

ERROR

EMPTY


states.


Examples:


Chat:


Sending...

Unable to send message.

Retry


Documents:


Uploading...

Upload complete.

Upload failed.


Authentication:


Signing in...

Invalid credentials.

Account created.


Voice:


Listening...

Processing...

Speech recognition unavailable.


Do not silently fail.


Do not replace errors with fake successful AI responses.


============================================================

34. LOADING STATES

============================================================


Create polished loading states.


For chat:


Use a subtle typing/processing indicator.


For documents:


Use upload progress where available.


For voice:


Use a clear listening animation.


Do not over-animate the application.


Keep animations subtle and professional.


============================================================

35. COMPONENT ARCHITECTURE

============================================================


Use reusable components.


A reasonable structure may be:


src/

  components/

    layout/

    chat/

    voice/

    documents/

    settings/

    auth/

    common/


  pages/

    Landing.jsx

    Login.jsx

    Signup.jsx

    Dashboard.jsx

    Chat.jsx

    Voice.jsx

    Documents.jsx

    Settings.jsx


  services/

    api.js

    auth.js

    chat.js

    documents.js

    voice.js


  context/

    AuthContext.jsx

    ThemeContext.jsx

    LanguageContext.jsx


  lib/

    supabase.js


  i18n/

    en.js

    ur.js

    romanUrdu.js


This is an example architecture.


Inspect the existing project if files already exist and preserve useful existing structure rather than unnecessarily rebuilding everything.


============================================================

36. DO NOT OVERENGINEER

============================================================


I know HTML, CSS, JavaScript and basic React.


Therefore:


Write code that I can understand and maintain.


Avoid unnecessary:


• complex state libraries

• complicated design systems

• unnecessary TypeScript conversion

• excessive abstractions

• unnecessary packages

• over-engineered architecture


Professional does NOT mean unnecessarily complicated.


============================================================

37. DO NOT REDESIGN RANDOMLY

============================================================


If I provide an existing frontend:


FIRST inspect it.


Then:


• preserve good structure

• preserve useful components

• preserve working functionality

• improve only where required


Do not randomly redesign the whole project.


If something must be changed, explain why.


============================================================

38. DATABASE / SUPABASE BOUNDARY

============================================================


Supabase will be used for user authentication and potentially user-related data.


However, do not assume the complete backend database schema.


The backend teammate will provide the final database/agent structure.


Therefore make the frontend modular.


For example:


Frontend

    ↓

API service

    ↓

Backend


and separately:


Supabase Auth

    ↓

Authenticated user


Do not tightly couple the UI to an invented backend schema.


============================================================

39. FUTURE AI AGENTS

============================================================


The current overall concept may contain multiple agents.


Potential architecture:


USER

 ↓

CHAT FRONTEND

 ↓

BACKEND

 ↓

CONVERSATION / INTAKE AGENT

 ↓

RESEARCH AGENT

 ↓

OPTIONAL CASE ASSESSMENT AGENT

 ↓

BACKEND

 ↓

FRONTEND


The frontend should NOT care how many agents are inside the backend.


It should simply receive structured responses from the backend.


This makes the frontend future-proof.


============================================================

40. LEGAL DISCLAIMER

============================================================


Apna Wakeel provides legal navigation/information.


It must NOT present itself as a human lawyer.


Include an appropriate, clear disclaimer such as:


"Apna Wakeel provides legal information and navigation support. It does not replace advice from a qualified lawyer."


Keep the disclaimer visible but not intrusive.


============================================================

41. USER EXPERIENCE

============================================================


The most important UX principle:


A person may come to Apna Wakeel because they are confused, stressed, or do not understand legal terminology.


Therefore the interface should feel:


Simple.

Clear.

Calm.

Friendly.

Professional.


Avoid technical legal terminology in UI labels when a simpler phrase is possible.


For example:


Instead of:


"Initiate Legal Query"


use:


"Describe your problem"


Instead of:


"Submit Case Facts"


use:


"Tell us what happened"


============================================================

42. EXAMPLE USER JOURNEY

============================================================


Build the interface around this journey:


USER

↓

Sign Up

↓

Login

↓

Dashboard

↓

New Chat

↓

"Someone has not paid my salary for three months."

↓

AI response

↓

AI asks relevant clarification naturally

↓

User answers

↓

AI continues

↓

Research Agent eventually provides:

    • relevant law

    • authority

    • procedure

    • documents

    • evidence

    • next steps

    • lawyer type

    • sources

↓

User can continue the conversation


The frontend should make this journey feel natural.


============================================================

43. IMPORTANT: NO FIXED QUESTIONNAIRE

============================================================


The old Apna Wakeel concept used fixed follow-up questions.


We are now moving away from that.


DO NOT create a fixed:


Question 1

Question 2

Question 3


workflow.


The user should interact through conversation.


The backend/AI agent will decide what information is needed.


The frontend simply displays the conversation.


============================================================

44. DOCUMENT + CHAT FLOW

============================================================


The user should be able to say:


"My landlord is refusing to return my deposit."


Then attach:


rental_agreement.pdf


The UI should show:


User message

+

attached document


The backend later receives the conversation and document reference.


The frontend should not itself interpret the legal document.


============================================================

45. VOICE + CHAT FLOW

============================================================


Voice must feel like another way to communicate with the SAME Apna Wakeel assistant.


Typed:


USER → CHAT → BACKEND → AI → CHAT


Voice:


USER → SPEECH → CHAT/BACKEND → AI → TEXT/VOICE


Do not create disconnected systems.


============================================================

46. FINAL IMPLEMENTATION REQUIREMENT

============================================================


Before writing code:


1. Inspect the existing project.

2. Understand its current architecture.

3. Identify reusable components.

4. Identify what needs to be created.

5. Explain the planned architecture briefly.

6. Then implement it.


Do not destroy existing working code unnecessarily.


============================================================

47. FINAL DELIVERABLES

============================================================


I expect:


1. Complete React frontend

2. Functional Sign Up

3. Functional Login

4. Supabase Auth integration

5. Protected dashboard

6. Chat interface

7. New Chat

8. Conversation history UI

9. Voice input interface

10. Two-way voice interface architecture

11. Documents interface

12. Document upload architecture

13. Settings page

14. English support

15. Urdu support

16. Roman Urdu support

17. RTL Urdu support

18. Light/Dark theme

19. Responsive mobile design

20. Professional Apna Wakeel branding

21. API service layer

22. Clean backend integration points

23. Loading states

24. Error states

25. Empty states

26. Accessibility basics

27. Legal disclaimer


============================================================

48. FINAL TESTING

============================================================


Before finishing, test these flows:


TEST 1:

New user

→ Sign Up

→ authenticated

→ Dashboard


TEST 2:

Existing user

→ Login

→ Dashboard


TEST 3:

Chat

→ New Chat

→ type message

→ send

→ API layer called


TEST 4:

Voice input

→ microphone

→ speech-to-text

→ text appears

→ user edits

→ send


TEST 5:

Documents

→ upload document

→ display attachment

→ remove document


TEST 6:

Navigation

→ Chat

→ Voice

→ Documents

→ Settings

→ back to Chat


TEST 7:

Language

→ English

→ Urdu

→ Roman Urdu


TEST 8:

Theme

→ Light

→ Dark

→ preference persists


TEST 9:

Mobile responsive layout


TEST 10:

Logout

→ session destroyed

→ user returns to Login


============================================================

49. FINAL RULE

============================================================


DO NOT BUILD A FAKE AI WEBSITE.


Build a REAL FRONTEND ARCHITECTURE that is READY for the REAL Apna Wakeel backend.


The frontend must be beautiful, but functionality and clean architecture are more important than decoration.


The user experience must be simple enough for someone with little technical knowledge.


The visual identity should feel:


AUTHENTIC

PROFESSIONAL

PAKISTANI

LEGAL

MODERN

SIMPLE

TRUSTWORTHY


NOT:


CHILDISH

COLORFUL

CROWDED

OLD-FASHIONED

GENERIC


The final result should feel like a serious Pakistani legal-navigation platform while remaining as easy to use as a modern conversational application.


START BY INSPECTING THE PROJECT.

THEN EXPLAIN THE ARCHITECTURE.

THEN IMPLEMENT THE FRONTEND.

DO NOT GUESS ABOUT THE BACKEND.

KEEP BACKEND INTEGRATION MODULAR.

DO NOT USE FAKE LEGAL ANSWERS.

DO NOT EXPOSE SECRETS.

DO NOT REMOVE FUNCTIONALITY THAT ALREADY WORKS.