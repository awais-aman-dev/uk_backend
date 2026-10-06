(function () {
    "use strict";

    function markActiveNavItem() {
        var links = document.querySelectorAll("#jazzy-navigation .nav-link[href]");
        var path = window.location.pathname;
        var best = null;
        var bestLength = 0;

        links.forEach(function (link) {
            var href = link.getAttribute("href");
            if (!href || href === "#") {
                return;
            }
            if (path === href || (path.indexOf(href) === 0 && href.length > bestLength)) {
                best = link;
                bestLength = href.length;
            }
        });

        if (best) {
            best.classList.add("active");
            best.setAttribute("aria-current", "page");
        }
    }

    function readIdentity() {
        var node = document.getElementById("adm-identity");
        if (!node) {
            return null;
        }
        try {
            return JSON.parse(node.textContent);
        } catch (err) {
            return null;
        }
    }

    function initials(name) {
        var parts = String(name || "").trim().split(/[\s@._-]+/).filter(Boolean);
        if (!parts.length) {
            return "?";
        }
        return parts.slice(0, 2).map(function (part) {
            return part.charAt(0).toUpperCase();
        }).join("");
    }

    function buildHeader() {
        var identity = readIdentity();
        var menu = document.querySelector("#jazzy-navbar .navbar-nav.ms-auto");
        var toggle = document.querySelector("#jazzy-navbar .nav-item.dropdown > .nav-link[data-bs-toggle='dropdown']");
        if (!identity || !menu || !toggle) {
            return;
        }

        var dropdown = toggle.parentElement;
        var passwordLink = dropdown.querySelector("a[href*='password_change']");
        var logoutForm = dropdown.querySelector("form[action*='logout']");

        toggle.innerHTML = "";
        toggle.classList.add("adm-user-chip");

        var avatar = document.createElement("span");
        avatar.className = "adm-avatar adm-avatar--header";
        avatar.textContent = initials(identity.name);
        toggle.appendChild(avatar);

        var text = document.createElement("span");
        text.className = "adm-user-chip-text";

        var name = document.createElement("span");
        name.className = "adm-user-chip-name";
        name.textContent = identity.name;
        text.appendChild(name);

        var roleLabel = identity.role || (identity.isSuperuser ? "Administrator" : "Staff");
        var role = document.createElement("span");
        role.className = "adm-user-chip-role";
        role.textContent = roleLabel;
        text.appendChild(role);

        toggle.appendChild(text);

        if (passwordLink) {
            var passwordItem = document.createElement("li");
            passwordItem.className = "nav-item adm-header-action";
            var link = document.createElement("a");
            link.className = "nav-link";
            link.href = passwordLink.getAttribute("href");
            link.textContent = "Change password";
            passwordItem.appendChild(link);
            menu.insertBefore(passwordItem, dropdown);
        }

        if (logoutForm) {
            var logoutItem = document.createElement("li");
            logoutItem.className = "nav-item adm-header-action";
            var logout = document.createElement("button");
            logout.type = "button";
            logout.className = "nav-link adm-logout";
            logout.textContent = "Log out";
            logout.addEventListener("click", function () {
                if (logoutForm.requestSubmit) {
                    logoutForm.requestSubmit();
                } else {
                    logoutForm.submit();
                }
            });
            logoutItem.appendChild(logout);
            menu.appendChild(logoutItem);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        markActiveNavItem();
        buildHeader();
    });
})();
