export type PanelChoice = 'agent' | 'employee'

const PANEL_CHOICE_KEY = 'helpfix-panel-choice'

export function getStoredPanelChoice(): PanelChoice | null {
  const v = localStorage.getItem(PANEL_CHOICE_KEY)
  return v === 'agent' || v === 'employee' ? v : null
}

export function setStoredPanelChoice(choice: PanelChoice) {
  localStorage.setItem(PANEL_CHOICE_KEY, choice)
}

export function clearStoredPanelChoice() {
  localStorage.removeItem(PANEL_CHOICE_KEY)
}

/** URL'deki ?panel= parametresini okur — "yeni sekmede aç" ile açılan
 * sekmeler bunu kullanır; localStorage'daki kalıcı tercihi ETKİLEMEZ,
 * sadece o sekme için geçerlidir. */
export function getPanelFromUrl(): PanelChoice | null {
  const v = new URLSearchParams(window.location.search).get('panel')
  return v === 'agent' || v === 'employee' ? v : null
}
