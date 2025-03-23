const defaultValues = {
    black_list: [],
};

let myPort = browser.runtime.connect({ name: "port-from-popup" });

window.onload = function () {
    // Fetch manifest data
    fetch("manifest.json")
        .then((x) => x.json())
        .then((x) => {
            document.querySelectorAll(".version").forEach((z) => (z.innerText = x.version));
            let production = x.browser_specific_settings.gecko.id;
            document.querySelectorAll(".mode").forEach((z) => {
                z.textContent = production ? "Production Mode" : "Development Mode";
                z.className = `mode ${production ? "production" : ""}`;
            });
        });

    // Update settings function
    const updateFunction = function () {
        const checkboxStatus = Object.fromEntries(
            [...document.querySelectorAll(".toggle input")].map((input) => [input.id, input.checked])
        );
        const blacklistStatus = {
            black_list:
                Array.from(document.querySelectorAll("#excluded-list li"))
                    .map((li) => li.textContent.trim().replace("×", ""))
                    .join("\n") || defaultValues.black_list,
        };
        browser.storage.local.set({ ...checkboxStatus, ...blacklistStatus }, () => {
            myPort.postMessage({ type: "settings-updated", data: { ...checkboxStatus, ...blacklistStatus } });
            document.querySelector(".status-label").textContent = checkboxStatus.enable_ultimadark ? "Enabled" : "Disabled";
            const list = document.querySelector("#excluded-list");
            const emptyList = document.querySelector("#empty-list");
            emptyList.style.display = list.children.length > 0 ? "none" : "block";
        });
    };

    // Populate excluded list and handle exclusion
    const updateExcludeText = function () {
        const input = document.querySelector("#exclude-url");
        const addButton = document.querySelector("#add-exclude");
        const excludeCurrentButton = document.querySelector("#exclude-current");

        addButton.onclick = () => {
            const url = input.value.trim();
            if (url && !url.startsWith("about:") && !url.startsWith("chrome:")) {
                addToList(url);
                input.value = "";
            }
        };

        excludeCurrentButton.onclick = () => {
            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = new URL(tabs[0].url).hostname;
                if (url && !url.startsWith("about:") && !url.startsWith("chrome:")) {
                    addToList(url);
                }
            });
        };

        function addToList(url) {
            const list = document.querySelector("#excluded-list");
            const items = Array.from(list.children).map((li) => li.textContent.trim().replace("×", ""));
            if (!items.includes(url)) {
                const li = document.createElement("li");
                li.innerHTML = `${url} <button class="remove" aria-label="Remove ${url}">×</button>`;
                list.appendChild(li);
                li.querySelector(".remove").onclick = () => {
                    li.remove();
                    updateFunction();
                };
                updateFunction();
            }
        }
    };

    // Initialize settings
    const toggleInputs = document.querySelectorAll(".toggle input");
    browser.storage.local.get(null, function (res) {
        toggleInputs.forEach((input) => {
            input.checked = res[input.id] !== undefined ? res[input.id] : input.hasAttribute("checked");
            input.onchange = updateFunction;
        });
        document.querySelector(".status-label").textContent = res.enable_ultimadark ? "Enabled" : "Disabled";
        const blackList = res.black_list ? res.black_list.split("\n").filter((x) => x) : defaultValues.black_list;
        const list = document.querySelector("#excluded-list");
        const emptyList = document.querySelector("#empty-list");
        if (blackList.length > 0) {
            emptyList.style.display = "none";
            blackList.forEach((domain) => {
                const cleanDomain = domain.replace("*://", "").replace("/*", "");
                const li = document.createElement("li");
                li.innerHTML = `${cleanDomain} <button class="remove" aria-label="Remove ${cleanDomain}">×</button>`;
                list.appendChild(li);
                li.querySelector(".remove").onclick = () => {
                    li.remove();
                    updateFunction();
                };
            });
        } else {
            emptyList.style.display = "block";
        }
        updateExcludeText();
    });

    // Close window on footer link click
    document.addEventListener("click", (e) => {
        if (e.target.closest(".footer a")) setTimeout(() => window.close(), 100);
    });
};