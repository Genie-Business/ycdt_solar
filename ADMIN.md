# Website admin

Admins edit the site at `/admin.html`. Saving commits the change to this GitHub repo and Vercel redeploys.

## One-time setup (Vercel project > Settings > Environment Variables, Production)

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | A long password you choose. Anyone with it can edit the site. |
| `GITHUB_TOKEN` | A GitHub fine-grained token: only repository `Genie-Business/ycdt-solar`, permission Contents: Read and write. |
| `GITHUB_REPO` | `Genie-Business/ycdt-solar` |

Optional: `GITHUB_BRANCH` (default `main`), `ADMIN_SECRET` (set a random string to sign sessions independently of the password).

Redeploy after adding them. To sign everyone out or change the password, change `ADMIN_PASSWORD` and redeploy.

## What can be edited
Text, photos and alt text, links, duplicate/delete/reorder items, page title and description, contact details and the enquiry form endpoint.

Not editable from the admin: videos (too large for the save route, commit them with Git), the shared header and footer, and the 3D module's label names.

## The 500 kW video
`tools/ess-video.html` renders `assets/video/ess-500kw.mp4` in the browser. It is not deployed.
