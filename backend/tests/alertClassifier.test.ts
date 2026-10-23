import { describe, expect, it } from 'vitest';
import { classifyAdvisory, isAlert, lguPostCategory } from '../src/services/alertClassifier.js';

function kind(text: string) {
  const { type, severity } = classifyAdvisory(text);
  return `${type}/${severity}`;
}

describe('classifyAdvisory', () => {
  it('flags class suspensions as high, and other class advisories as medium', () => {
    expect(kind('WALAY KLASE | OCT 15 Based on the latest air quality advisory')).toBe('advisory/high');
    expect(kind('Classes suspended in all levels in Mandaue City')).toBe('advisory/high');
    expect(kind('FACE-TO-FACE CLASSES WILL RESUME TOMORROW, OCTOBER 16, 2026')).toBe('advisory/medium');
    // Styled Facebook text ("𝗖𝗟𝗔𝗦𝗦 𝗔𝗗𝗩𝗜𝗦𝗢𝗥𝗬") is read as plain letters.
    expect(kind('𝗖𝗟𝗔𝗦𝗦 𝗔𝗗𝗩𝗜𝗦𝗢𝗥𝗬 | 𝗢𝗖𝗧 𝟭𝟲 Face-to-face classes shall continue as scheduled')).toBe('advisory/medium');
  });

  it('does not treat news about suspension rules as a suspension', () => {
    expect(kind('Cebu drafts unified class suspension rules amid fluctuating air quality')).toBe('news/low');
  });

  it('flags major weather, floods and road blockages as high', () => {
    expect(kind('Typhoon Ada: Signal No. 2 raised over Cebu')).toBe('weather/high');
    expect(kind('Flooding hits low-lying barangays in Talisay')).toBe('flood/high');
    expect(kind('Hillside collapse narrows road')).toBe('closure/high');
    expect(kind('Rerouting scheme set for Kalag-Kalag')).toBe('closure/high');
  });

  it('ranks power and water interruptions low', () => {
    expect(kind('Scheduled power interruption in parts of Mandaue on Sunday')).toBe('power/low');
    expect(kind('Water interruption in Talamban, Banilad')).toBe('water/low');
  });

  it('flags heavy traffic as medium', () => {
    expect(kind('Heavy traffic expected along N. Bacalso Avenue')).toBe('traffic/medium');
  });

  it('keeps irrelevant news out of alerts', () => {
    for (const headline of [
      'Dizon removes DPWH officials amid flood control corruption probes',
      'Davao Light power rate rises to P13.33/kWh for Oct-Nov 2026',
      'COA flags Carcar Water District’s untitled lots',
      '2 suspects in Viernes killing arrested',
      'Cebu Greats face uphill battle after Game 1 loss to Quezon',
    ]) {
      const classification = classifyAdvisory(headline);
      expect(classification.type, headline).toBe('news');
      expect(isAlert(classification)).toBe(false);
    }
  });

  it('maps classifications to lgu_posts categories', () => {
    expect(lguPostCategory(classifyAdvisory('Walay klase ugma'))).toBe('class_suspension');
    expect(lguPostCategory(classifyAdvisory('Road closed for the parade'))).toBe('traffic');
    expect(lguPostCategory(classifyAdvisory('Flooding in Bulacao'))).toBe('weather');
    expect(lguPostCategory(classifyAdvisory('Brownout in Basak'))).toBe('utility');
    expect(lguPostCategory(classifyAdvisory('Happy fiesta!'))).toBe('general');
  });
});
