/** Collapsible folder trees (manual navigation) */

let allCollapsibleUls = document.querySelectorAll('ul ul');
let foldingStateChanged = false;
function refreshCollapsibleUls() {
    allCollapsibleUls = document.querySelectorAll('ul ul');
}

function isCollapsibleUl(elt) {
    return [].indexOf.call(allCollapsibleUls, elt) !== -1;
}

function findHashA() {
    const hash = location.hash.slice(1);
    if (hash.length === 0) {
	return null;
    }

    const nameFirefox = hash.split("/").map(decodeURIComponent).join("/");
    const nameChrome = hash;
    const eltsFF = document.getElementsByName(nameFirefox);
    const eltsChrome = document.getElementsByName(nameChrome);
    if (eltsFF.length > 0) {
	return eltsFF[0];
    } else if (eltsChrome.length > 0) {
	return eltsChrome[0];
    }
}

function toLi(elt) {
    while (elt.tagName !== 'LI') {
	elt = elt.parentElement;
    }
    return elt;
}

function aToUl(aElt) {
    return toLi(aElt).querySelector('ul');
}

function ulToA(ulElt) {
    return toLi(ulElt).querySelector('a');
}

function parentUl(ulElt) {
    let curElt = ulElt.parentElement;
    while (curElt !== document.body && !isCollapsibleUl(curElt)) {
	curElt = curElt.parentElement;
    }
    return isCollapsibleUl(curElt) && curElt;
}

function updateFolderIcon(ulElt) {
    const li = toLi(ulElt);
    if (isUlShown(ulElt)) {
	li.classList.add('li-folder-open');
    } else {
	li.classList.remove('li-folder-open');
    }
}

function hideUl(ulElt) {
    foldingStateChanged = true;
    ulElt.classList.add("hidden");
    updateFolderIcon(ulElt);
}

function showUl(ulElt) {
    foldingStateChanged = true;
    ulElt.classList.remove("hidden");
    updateFolderIcon(ulElt);
}

function toggleUl(ulElt) {
    foldingStateChanged = true;
    ulElt.classList.toggle('hidden');
    updateFolderIcon(ulElt);
}

function isUlShown(ulElt) {
    return !ulElt.classList.contains('hidden');
}

function linkClickedHandler(event) {
    toggleUl(aToUl(event.target));
}

function setupLink(ulElt) {
    const elt = ulToA(ulElt);
    if (elt.tagName === "A" && !elt.href) {
	elt.href = "javascript:void(0)";
	elt.addEventListener("click", linkClickedHandler);
    }
}

function hideAll() {
    [].forEach.call(allCollapsibleUls, hideUl);
}

function showAll() {
    [].forEach.call(allCollapsibleUls, showUl);
}

function normalizedPath() {
    const hasTrailingSlash = location.pathname.slice(-1) === '/';
    return location.pathname.slice(1 /*leading slash*/) + (hasTrailingSlash ? '' : '/');
}

function isFoldablePage() {
    const numCarPathParts = 3;
    const maxUnfoldedLis = 20;

    return normalizedPath().slice(0, -1).split('/').length > numCarPathParts
	&& document.getElementsByTagName('li').length > maxUnfoldedLis;
}

function saveState() {
    refreshCollapsibleUls();
    const foldingState = foldingStateChanged

	  ? [].map.call(allCollapsibleUls, isUlShown)
	  .map(c => c ? '1' : '0')
	  .join('')

	  : null;

    const state = {
	lastHash: location.hash,
	folding: foldingState,
	scrollY: window.scrollY,
    };
    sessionStorage.setItem(normalizedPath(), JSON.stringify(state));
}

function charmFoldingBeforeUnload() {
    saveState();
}

function restoreState() {
    refreshCollapsibleUls();
    const stateStr = sessionStorage.getItem(normalizedPath());
    if (stateStr) {
	const state = JSON.parse(stateStr);
	if (state.folding) {
	    state.folding.split('').forEach((ch, i) => {
		if (ch === '1') {
		    showUl(allCollapsibleUls[i]);
		}  else if (ch === '0') {
		    hideUl(allCollapsibleUls[i]);
		} else {
		    console.error('Illegal state');
		    sessionStorage.removeItem(normalizedPath());
		}
	    });
	}
	state.alreadySeenHash = location.hash === state.lastHash;
	if (state.alreadySeenHash) {
	    window.scroll(window.scrollX, state.scrollY);
	}
	return state;
    }
    return false;
}

function main() {
    refreshCollapsibleUls();
    if (!isFoldablePage()) {
	if (document.getElementById('expand-all')) {
	    document.getElementById('expand-all').classList.add('hidden');
	    document.getElementById('collapse-all').classList.add('hidden');
	}
	[].forEach.call(allCollapsibleUls, elt => toLi(elt).classList.add('li-folder-open'));
	return;
    }

    [].forEach.call(allCollapsibleUls, setupLink);
    window.removeEventListener('beforeunload', charmFoldingBeforeUnload);
    window.addEventListener('beforeunload', charmFoldingBeforeUnload);

    const ex = document.getElementById("expand-all");
    const col = document.getElementById("collapse-all");
    if (ex && col) {
	const ex2 = ex.cloneNode(true);
	const col2 = col.cloneNode(true);
	ex.parentNode.replaceChild(ex2, ex);
	col.parentNode.replaceChild(col2, col);
	ex2.addEventListener("click", showAll);
	col2.addEventListener("click", hideAll);
    }

    const restoredState = restoreState();
    if (!(restoredState && restoredState.folding)) {
	hideAll();
    }

    const alreadySeenHash = restoredState && restoredState.alreadySeenHash;
    const hashA = findHashA();
    if (hashA) {
	const hashUl = aToUl(hashA);
	let hashUlParent = hashUl;
	while (hashUlParent) {
	    showUl(hashUlParent);
	    hashUlParent = parentUl(hashUlParent);
	}
	toLi(hashA).classList.add("selected");
	if (!alreadySeenHash) {
	    hashA.scrollIntoView();
	    window.scrollY -= 50;
	}
    }

    foldingStateChanged = false;
}

/** EN/RU i18n (embedded JSON, file://-safe) */

const CHARM_LANG_KEY = 'charmLang';

function charmMainElement() {
    const m = document.querySelector('.main');
    if (m) {
	return m;
    }
    return document.querySelector('[data-charm-main]');
}

function parseCharmRuPayload() {
    const raw = document.getElementById('charm-i18n-ru');
    if (!raw || !raw.textContent.trim()) {
	return null;
    }
    try {
	return JSON.parse(raw.textContent);
    } catch (e) {
	console.warn('charm-i18n-ru: invalid JSON', e);
	return null;
    }
}

function getCharmStoredLang() {
    try {
	const v = localStorage.getItem(CHARM_LANG_KEY);
	return v === 'ru' ? 'ru' : 'en';
    } catch (e) {
	return 'en';
    }
}

function setCharmStoredLang(lang) {
    try {
	localStorage.setItem(CHARM_LANG_KEY, lang);
    } catch (e) { /* ignore */ }
}

const charmEnSnapshot = {
    title: null,
    metaDescription: null,
    mainInnerHTML: null,
    brandingInnerHTML: null,
    footerInnerHTML: null,
    breadcrumbTexts: null,
    aboutTitleHtml: null,
};

function captureCharmEnSnapshot() {
    charmEnSnapshot.title = document.title;
    const meta = document.querySelector('meta[name="description"]');
    charmEnSnapshot.metaDescription = meta ? meta.getAttribute('content') : null;

    const mainEl = charmMainElement();
    charmEnSnapshot.mainInnerHTML = mainEl ? mainEl.innerHTML : null;

    const brand = document.querySelector('.branding');
    charmEnSnapshot.brandingInnerHTML = brand ? brand.innerHTML : null;

    const foot = document.querySelector('.footer');
    charmEnSnapshot.footerInnerHTML = foot ? foot.innerHTML : null;

    const crumbs = document.querySelectorAll('.breadcrumb-part');
    charmEnSnapshot.breadcrumbTexts = [].map.call(crumbs, a => a.textContent);

    const ah1 = document.querySelector('.about-h1');
    charmEnSnapshot.aboutTitleHtml = ah1 ? ah1.innerHTML : null;
}

function applyCharmBreadcrumbTexts(texts) {
    if (!texts || !texts.length) {
	return;
    }
    const crumbs = document.querySelectorAll('.breadcrumb-part');
    if (texts.length !== crumbs.length) {
	return;
    }
    for (let i = 0; i < crumbs.length; i++) {
	crumbs[i].textContent = texts[i];
    }
}

function applyCharmLang(lang, ruPayload) {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'en';

    const meta = document.querySelector('meta[name="description"]');
    const mainEl = charmMainElement();
    const brand = document.querySelector('.branding');
    const foot = document.querySelector('.footer');
    const ah1 = document.querySelector('.about-h1');

    if (lang === 'ru' && ruPayload) {
	if (ruPayload.title) {
	    document.title = ruPayload.title;
	}
	if (meta && ruPayload.metaDescription != null) {
	    meta.setAttribute('content', ruPayload.metaDescription);
	}
	if (mainEl && ruPayload.main != null) {
	    mainEl.innerHTML = ruPayload.main;
	}
	if (brand && ruPayload.branding != null) {
	    brand.innerHTML = ruPayload.branding;
	}
	if (foot && ruPayload.footer != null) {
	    foot.innerHTML = ruPayload.footer;
	}
	if (ruPayload.breadcrumbs) {
	    applyCharmBreadcrumbTexts(ruPayload.breadcrumbs);
	}
	if (ah1 && ruPayload.aboutTitleHtml != null) {
	    ah1.innerHTML = ruPayload.aboutTitleHtml;
	}
	return;
    }

    document.title = charmEnSnapshot.title;
    if (meta && charmEnSnapshot.metaDescription != null) {
	meta.setAttribute('content', charmEnSnapshot.metaDescription);
    }
    if (mainEl && charmEnSnapshot.mainInnerHTML != null) {
	mainEl.innerHTML = charmEnSnapshot.mainInnerHTML;
    }
    if (brand && charmEnSnapshot.brandingInnerHTML != null) {
	brand.innerHTML = charmEnSnapshot.brandingInnerHTML;
    }
    if (foot && charmEnSnapshot.footerInnerHTML != null) {
	foot.innerHTML = charmEnSnapshot.footerInnerHTML;
    }
    if (charmEnSnapshot.breadcrumbTexts) {
	applyCharmBreadcrumbTexts(charmEnSnapshot.breadcrumbTexts);
    }
    if (ah1 && charmEnSnapshot.aboutTitleHtml != null) {
	ah1.innerHTML = charmEnSnapshot.aboutTitleHtml;
    }
}

function updateCharmLangToggleButton(toggle, lang, hasRu) {
    if (!toggle) {
	return;
    }
    if (!hasRu) {
	toggle.disabled = true;
	toggle.textContent = 'RU';
	toggle.setAttribute('aria-label', 'Russian translation not available for this page');
	toggle.classList.add('charm-lang-toggle--disabled');
	return;
    }
    toggle.disabled = false;
    toggle.classList.remove('charm-lang-toggle--disabled');
    if (lang === 'en') {
	toggle.textContent = 'Русский';
	toggle.setAttribute('aria-label', 'Switch to Russian');
	toggle.setAttribute('lang', 'ru');
    } else {
	toggle.textContent = 'English';
	toggle.setAttribute('aria-label', 'Switch to English');
	toggle.setAttribute('lang', 'en');
    }
}

function initCharmI18n() {
    const ruPayload = parseCharmRuPayload();
    const hasRu = !!(ruPayload && (
	ruPayload.main != null ||
	ruPayload.title ||
	ruPayload.metaDescription != null ||
	ruPayload.branding != null ||
	ruPayload.footer != null ||
	(ruPayload.breadcrumbs && ruPayload.breadcrumbs.length) ||
	ruPayload.aboutTitleHtml != null
    ));
    const toggle = document.getElementById('charm-lang-toggle');

    captureCharmEnSnapshot();

    let lang = getCharmStoredLang();
    if (lang === 'ru' && !hasRu) {
	lang = 'en';
	setCharmStoredLang('en');
    }

    applyCharmLang(lang, ruPayload);
    updateCharmLangToggleButton(toggle, lang, hasRu);

    if (toggle && hasRu) {
	toggle.addEventListener('click', function charmLangToggleClick() {
	    const next = getCharmStoredLang() === 'en' ? 'ru' : 'en';
	    setCharmStoredLang(next);
	    applyCharmLang(next, ruPayload);
	    updateCharmLangToggleButton(toggle, next, hasRu);
	    foldingStateChanged = false;
	    refreshCollapsibleUls();
	    main();
	});
    }
}

initCharmI18n();
main();
