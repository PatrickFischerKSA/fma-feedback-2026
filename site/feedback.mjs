export const titles = ["Von der Fantasie zur eigenen Figur – Eine offene Gestaltungsaufgabe im Fach Bildnerisches Gestalten", "Mit Dampf und Strom in die Moderne – Eine Unterrichtseinheit für die erste FMS-Klasse", "Multisensorisches Lernen im Schulalltag – Planung, Durchführung, Auswertung einer Unterrichtseinheit", "Musikvideoprojekt «Wellerman»", "Social-Media-Prävention bei 5. und 6. Klässler", "Kamera, Action: Eine neue Lernmethode in Form von Legevideos einführen", "Die kognitive Entwicklung im Kindesalter", "«Ich bin ich – so wie ich bin, bin ich richtig»", "Adolf Hitler: Töten oder töten lassen?", "Mehrsprachigkeit als Chance / Vorwissen nutzen, um eine neue Sprache zu lernen", "Motivation durch Unterrichtspausen", "Vom Ton zur Bewegung und zum Bild", "Kleine Hände in der Backstube – eine handlungsorientierte Backlektion im ersten Kindergartenjahr", "Von der Idee zur fertigen Geschichte – Deutschunterricht in der 6. Klasse", "Der Weg zum Schulhund: Ein praxisnaher Leitfaden von der Ausbildung bis zum Einsatz im Unterricht", "Mit allen Sinnen in eine Geschichte eintauchen", "Förderstrategien für Schüler mit LRS im Praxistest", "Muskelgesundheit: Entwicklung und Durchführung einer interaktiven Unterrichtseinheit für Jugendliche", "Viele Sprachen, eine Klasse!", "Die Atombombe im fächerübergreifenden Unterricht", "Was hat der Znüni mit der Konzentration zu tun?", "Die Motivation der Kindergartenkinder während einer Bewegungsgeschichte", "Unterrichtseinheit zur Emotionalen Kompetenz", "Fokus-Pause – Eine Kartensammlung für mehr Fokus, Ruhe und Aufmerksamkeit im Unterricht", "Förderung der Stresskompetenz bei Jugendlichen / Theorie und Postenlauf in einer 2. Oberstufe", "Verständnis und Bewusstsein für ADHS im Klassenzimmer schaffen", "Konzentrationsfähigkeit und Klaviermusik in der 4. Klasse", "Einfluss verschiedener Bewegungspausen auf die Konzentration von Fünftklässlern"];
export const prompts = [
  'Der rote Faden war für mich klar.',
  'Die Beispiele haben mir beim Verstehen geholfen.',
  'Die Visualisierung hat das Thema verständlich gemacht.',
  'Die Präsentation hat mich neugierig auf das Thema gemacht.',
  'Ein konkretes Beispiel würde mir beim Verstehen helfen.',
  'Bei den Ergebnissen hätte mir eine kurze Zusammenfassung geholfen.',
  'An einer Stelle hätte ich mir mehr Zeit zum Mitdenken gewünscht.'
];
export function feedbackError(value) {
  const normal = value.normalize('NFKD').toLowerCase().replace(/\p{M}|\p{Cf}/gu, '').replace(/ß/g, 'ss');
  const compact = normal.replace(/[^a-z0-9]/g, '');
  const insults = /arschloch|vollidiot|dummkopf|hurensohn|missgeburt|fickdich|halt(s|die)maul|haltdiefresse|dubistdumm|dubistpeinlich|dubistwertlos|bringdichum|gehsterben|duopfer|duversager|saukacke|totalerscheiss/;
  if (insults.test(compact) || /\b(idiot(?:in|en)?|wichser|schlampe|fotze|scheiss(?:e|vortrag)?|behindert|minderbemittelt|blodmann|scheissegal)\b/.test(normal)) {
    return 'Bitte formuliere sachlich. Nenne eine konkrete Beobachtung oder einen Verbesserungsvorschlag.';
  }
  if (/(https?:|www\.|@|\d{7})/i.test(value)) return 'Bitte lass Links und Kontaktdaten weg.';
  return '';
}

