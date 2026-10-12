/** The element dialogs, popovers and menus of the fun layer render into: it carries .fun-scope so they get the fun styles. */
export const funPortal = () => (typeof document === 'undefined' ? undefined : document.getElementById('fun-portal') || undefined);
