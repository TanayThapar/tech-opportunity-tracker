import { describe, it, expect, vi } from 'vitest';
import { fetchMLHHackathons } from '@/lib/sources/hackathons';
import { fetchLiveInternships } from '@/lib/sources/internships';
import { fetchLiveWebFeedsWithErrors } from '@/lib/sources';

describe('Web Crawlers & Source Adapters', () => {
  it('parses hackathon event structures from MLH schedule format', async () => {
    const mockMlhHtml = `
      <html>
        <body>
          <script>
            var state = {"events":[
              {"id":"evt-1","slug":"hackprix-2027","name":"HackPrix 2027","status":"upcoming","startsAt":"2027-09-15T12:00:00Z","endsAt":"2027-09-16T18:00:00Z","dateRange":"SEP 15 - 16","url":"\\/events\\/hackprix-2027\\/apply","location":"Hyderabad, India","formatType":"physical"},
              {"id":"evt-2","slug":"virtual-hack-2027","name":"Global Virtual Hack","status":"upcoming","startsAt":"2027-10-01T10:00:00Z","endsAt":"2027-10-03T18:00:00Z","dateRange":"OCT 01 - 03","url":"https://example.com/apply","location":"Everywhere","formatType":"digital"}
            ]};
          </script>
        </body>
      </html>
    `;

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(mockMlhHtml, { status: 200 });
    });

    const items = await fetchMLHHackathons();
    expect(items.length).toBeGreaterThanOrEqual(1);

    const first = items[0];
    expect(first.type).toBe('hackathon');
    expect(first.organizer).toBe('Major League Hacking');
    expect(first.format).toBe('in-person');
    expect(first.source_url).toContain('https://mlh.io/events/hackprix-2027/apply');

    vi.restoreAllMocks();
  });

  it('parses internship listings from SimplifyJobs markdown table format', async () => {
    const mockReadme = `
      <table>
      <thead><tr><th>Company</th><th>Role</th><th>Location</th><th>Application</th></tr></thead>
      <tbody>
      <tr>
        <td><strong><a href="https://simplify.jobs/c/Amazon">Amazon</a></strong></td>
        <td>Software Development Engineer Intern 🎓</td>
        <td>Seattle, WA</td>
        <td><div align="center"><a href="https://amazon.jobs/en/jobs/12345/apply"><img src="apply.png" /></a></div></td>
      </tr>
      <tr>
        <td>🔥 <strong><a href="https://simplify.jobs/c/Apple">Apple</a></strong></td>
        <td>Machine Learning Engineering Intern</td>
        <td>Cupertino, CA (Hybrid)</td>
        <td><div align="center"><a href="https://jobs.apple.com/en-us/details/54321/apply"><img src="apply.png" /></a></div></td>
      </tr>
      </tbody>
      </table>
    `;

    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(mockReadme, { status: 200 });
    });

    const items = await fetchLiveInternships();
    expect(items.length).toBeGreaterThanOrEqual(2);

    const amazon = items.find(i => i.company === 'Amazon');
    expect(amazon).toBeDefined();
    expect(amazon?.type).toBe('internship');
    expect(amazon?.title).toBe('Amazon: Software Development Engineer Intern');
    expect(amazon?.source_url).toBe('https://amazon.jobs/en/jobs/12345/apply');
    expect(amazon?.format).toBe('in-person');

    const apple = items.find(i => i.company === 'Apple');
    expect(apple).toBeDefined();
    expect(apple?.format).toBe('hybrid');

    vi.restoreAllMocks();
  });

  it('isolates crawler failures and does not abort the pipeline aggregator', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () => {
      throw new Error('Simulated network timeout in crawler');
    });

    const result = await fetchLiveWebFeedsWithErrors();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(Array.isArray(result.items)).toBe(true);

    vi.restoreAllMocks();
  });
});
