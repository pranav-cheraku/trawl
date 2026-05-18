Trawl turns raw product feedback into a prioritized roadmap. You connect the places your feedback lives and ask questions about it in plain language. Every answer and every spec traces back to the real reviews behind it.

This guide walks through Trawl from an empty account to a working roadmap. Each step builds on the one before it.

## Create a project

A project is one workspace for one product. It holds that product's feedback sources, conversations, and specs, kept separate from your other projects.

From the dashboard, click **New Project** and give it a name. Open the project and you land on its workspace, where the rest of this guide takes place.

## Connect feedback sources

A source is one place your feedback comes from. Open the **Sources** tab and click **Add Source** to connect one. Trawl supports five kinds:

- **App Store.** Enter an app name and Trawl pulls its reviews across countries, dropping duplicates as it goes.
- **Google Play.** The same, for Android apps.
- **Reddit.** Pull posts and comments from a subreddit or a keyword search.
- **CSV.** Upload a spreadsheet of feedback you already have.
- **Manual paste.** Paste feedback in directly.

After a source is added, Trawl imports its reviews and indexes them for search. The status column shows when a source is ready to use.

## Explore your feedback

The **Explore** tab is a chat with your feedback. Ask a question in plain language and Trawl finds the reviews most relevant to it and answers from them.

Every answer is cited. Each citation opens the exact review it came from. The **RAG X-Ray** panel goes further: it shows the full set of reviews Trawl retrieved for an answer, each with a similarity score, so you can see exactly what the answer was based on.

Above the chat, the corpus strip lets you scope a conversation to specific sources and adjust how many reviews Trawl pulls for each question.

## Find what to build next

The **Build Next** tab answers a single question: what should we build next?

It runs five exploratory searches across your feedback, groups the results into themes, and drafts a feature spec for each theme. Themes are ranked by how often they come up, and the run finishes with a short executive summary.

Any draft spec from a Build Next run can be promoted straight onto your Kanban board.

## Manage specs on the board

The **Specs** tab is a Kanban board with four columns: Backlog, Planned, In Progress, and Done. Drag a card between columns to track its progress.

Click a card to open the spec. The title, problem, user stories, and priority are all editable inline. Each spec keeps the citations it was generated from, so the feedback behind it is always one click away.

You can generate specs from your whole corpus or from a focused topic. The board can be filtered by type, status, or priority, and exported to CSV or Markdown.

## Credits and billing

The AI actions in Trawl cost credits, and every new account starts with 25.

- An answer in Explore costs **1 credit**.
- Generating specs costs **5 credits**.
- A Build Next analysis costs **10 credits**.

Connecting sources, editing specs, and moving cards cost nothing. When you run low, the **Billing** page sells more credits.
