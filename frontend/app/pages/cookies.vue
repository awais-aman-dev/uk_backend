<template>
  <LegalPage
    title="Cookie policy"
    updated="5 October 2026"
    intro="We use one essential cookie to keep you signed in. No advertising or tracking cookies."
  >
    <h2>Cookies we use</h2>
    <table>
      <thead><tr><th>Name</th><th>Purpose</th><th>Lasts</th></tr></thead>
      <tbody>
        <tr>
          <td><code>theory_session</code></td>
          <td>Keeps you signed in. It can't be read by scripts on the page (httpOnly).</td>
          <td>30 days from your last visit</td>
        </tr>
      </tbody>
    </table>

    <h2>Why there's no cookie banner</h2>
    <p>
      Under UK rules (PECR), cookies that are strictly necessary for a service you asked for don't need consent. We
      don't use analytics or advertising cookies, so there's nothing to opt in to.
    </p>

    <h2>Removing cookies</h2>
    <p>
      You can delete cookies in your browser settings at any time. If you remove <code>theory_session</code>, you'll
      simply be signed out.
    </p>
  </LegalPage>
</template>
