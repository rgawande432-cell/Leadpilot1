# UrbanLeads Meta Social Connection — Setup

This guide is for the UrbanLeads owner. No programming is required.

## What we are connecting
- Facebook Page (publish/manage content and read supported insights after permissions)
- Instagram Professional account (Business or Creator; publishing and insights according to granted permissions)
- UrbanLeads will never display a Connected status until authorization is verified.

## One owner action needed to start Meta setup
1. Open https://developers.facebook.com/ and log in with the Facebook account that owns/administers the business Page.
2. Open **My Apps** and choose **Create App**.
3. Select a Business-type app/use case that supports Facebook Login and Instagram professional account APIs.
4. Name it **UrbanLeads Social**, enter the requested contact email, and create it.
5. Stop there and send the app dashboard link or tell us the app was created. Do not share the App Secret in chat.

## Account requirements
- Facebook Page: you need full/admin access.
- Instagram: Business or Creator/Professional account. For the Facebook Login path, it must be linked to the Facebook Page.
- The app may initially be in development mode and can authorize only app roles/testers. Public use requires Meta permissions/App Review and potentially business verification.

## Technical setup (developer-managed)
- OAuth login and callback routes
- Secure server-side token exchange and token encryption/storage
- Account and Page selection
- Connection status / reconnect / disconnect
- Publishing and insights APIs only after permissions and capability checks
- Webhook/event handling only where the Meta app is configured and permissions allow
- Never expose app secret or access tokens in browser code.

## Important
Facebook and Instagram API access is not guaranteed just by creating the app. Meta approval, permissions, account eligibility and review requirements apply. No fake connected status or fake posting.
