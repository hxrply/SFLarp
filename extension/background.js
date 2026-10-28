// The toolbar button opens SFLarp: Chrome/Edge/Brave side panel, Firefox sidebar, otherwise a normal tab.
const api = globalThis.browser || globalThis.chrome;
if (api.sidePanel?.setPanelBehavior) {
  api.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
} else {
  api.action.onClicked.addListener(() => {
    if (api.sidebarAction?.toggle) api.sidebarAction.toggle();
    else api.tabs.create({ url: api.runtime.getURL('sidepanel.html') });
  });
}
