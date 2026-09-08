<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Internet Fundamentals - Notes</title>
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    max-width: 900px;
    margin: 40px auto;
    padding: 0 20px;
    line-height: 1.65;
    color: #1f2937;
    background: #fdfdfd;
  }
  h1 {
    text-align: center;
    color: #ffffff;
    background: linear-gradient(90deg, #1d4ed8, #7c3aed);
    padding: 20px;
    border-radius: 10px;
  }
  h2 {
    color: #ffffff;
    background: #2563eb;
    padding: 8px 14px;
    border-radius: 6px;
    margin-top: 40px;
  }
  h3 {
    color: #7c3aed;
    border-bottom: 2px solid #ddd6fe;
    padding-bottom: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }
  th {
    background: #1e293b;
    color: white;
    padding: 8px 10px;
    text-align: left;
  }
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  tr:nth-child(even) {
    background: #f3f4f6;
  }
  .term { background: #fef08a; padding: 2px 5px; border-radius: 4px; font-weight: 600; } /* yellow */
  .def  { background: #bbf7d0; padding: 2px 5px; border-radius: 4px; } /* green */
  .protocol { background: #bfdbfe; padding: 2px 5px; border-radius: 4px; font-weight: 600; } /* blue */
  .warning { background: #fecaca; padding: 2px 5px; border-radius: 4px; } /* red */
  .note { background: #fed7aa; padding: 2px 5px; border-radius: 4px; } /* orange */
  .key  { background: #e9d5ff; padding: 2px 5px; border-radius: 4px; font-weight: 600; } /* purple */
  .code-block {
    background: #0f172a;
    color: #7dd3fc;
    padding: 14px 18px;
    border-radius: 8px;
    font-family: 'Consolas', monospace;
    overflow-x: auto;
    white-space: pre;
  }
  ul, ol { margin-left: 6px; }
  li { margin-bottom: 6px; }
  hr { border: none; border-top: 2px dashed #cbd5e1; margin: 30px 0; }
</style>
</head>
<body>

<h1>🌐 Internet Fundamentals</h1>

<h2>1. What is the Internet?</h2>
<p>The <span class="term">Internet</span> is a <span class="def">global network of interconnected computer networks</span> that communicate using standardized rules called <span class="protocol">protocols</span>. It is often called a "network of networks" because it connects millions of private, public, academic, business, and government networks worldwide into one single system.</p>

<h3>Key Characteristics</h3>
<ul>
  <li><span class="key">Decentralized</span>: No single organization owns or controls the entire Internet.</li>
  <li><span class="key">Global</span>: Spans across countries and continents, connecting billions of devices.</li>
  <li><span class="key">Packet-based</span>: Data is broken into small pieces called <span class="term">packets</span> before being sent.</li>
  <li><span class="key">Protocol-driven</span>: Communication follows agreed-upon standards (e.g., <span class="protocol">TCP/IP</span>).</li>
</ul>

<h3>Internet vs. World Wide Web (WWW)</h3>
<p>These terms are often confused but are <span class="warning">NOT the same</span>:</p>
<table>
  <tr><th>Internet</th><th>World Wide Web (WWW)</th></tr>
  <tr><td>The physical/hardware network infrastructure (cables, routers, servers)</td><td>A service that runs <i>on top of</i> the Internet</td></tr>
  <tr><td>Includes email, FTP, VoIP, WWW, etc.</td><td>Only refers to websites and web pages accessed via browsers</td></tr>
  <tr><td>Existed since ~1969 (via ARPANET)</td><td>Invented by <span class="term">Tim Berners-Lee</span> in 1989</td></tr>
</table>

<hr>

<h2>2. How the Internet Works</h2>

<h3>2.1 Basic Concept</h3>
<p>When you send or request data (like opening a website), it doesn't travel as one solid piece:</p>
<ol>
  <li>Broken into small <span class="term">packets</span> of data.</li>
  <li>Each packet is labeled with source and destination addresses.</li>
  <li>Packets travel independently, often via different paths, through routers.</li>
  <li>Packets are <span class="def">reassembled in the correct order</span> at the destination.</li>
</ol>

<h3>2.2 Key Components</h3>
<table>
  <tr><th>Component</th><th>Function</th></tr>
  <tr><td><span class="key">Devices (Clients)</span></td><td>Computers, phones, tablets requesting/using data</td></tr>
  <tr><td><span class="key">Servers</span></td><td>Powerful computers that store and serve websites/data</td></tr>
  <tr><td><span class="key">Routers</span></td><td>Direct data packets to the correct destination network</td></tr>
  <tr><td><span class="key">Switches</span></td><td>Connect devices within a local network</td></tr>
  <tr><td><span class="key">Modems</span></td><td>Convert digital signals to analog (and back) for transmission</td></tr>
  <tr><td><span class="key">Cables/Satellites</span></td><td>Physical/wireless medium carrying data</td></tr>
</table>

<h3>2.3 IP Addresses</h3>
<p>Every device connected to the Internet has a unique <span class="term">IP (Internet Protocol) address</span> — like a postal address for data.</p>
<ul>
  <li><span class="protocol">IPv4</span>: e.g., <code>192.168.1.1</code> (limited addresses, ~4.3 billion)</li>
  <li><span class="protocol">IPv6</span>: e.g., <code>2001:0db8:85a3::8a2e:0370:7334</code> (vastly larger address space)</li>
</ul>

<h3>2.4 Domain Name System (DNS)</h3>
<p><span class="term">DNS</span> acts as the <span class="note">"phonebook of the Internet"</span>, translating domain names into IP addresses.</p>
<ol>
  <li>You type <code>www.example.com</code> into a browser.</li>
  <li>The browser asks a DNS server: "What is the IP address for this domain?"</li>
  <li>DNS returns the IP address (e.g., <code>93.184.216.34</code>).</li>
  <li>Browser connects to the server at that IP address.</li>
</ol>

<h3>2.5 Important Protocols</h3>
<table>
  <tr><th>Protocol</th><th>Full Form</th><th>Purpose</th></tr>
  <tr><td><span class="protocol">TCP/IP</span></td><td>Transmission Control Protocol / Internet Protocol</td><td>Core protocol suite; ensures reliable data delivery</td></tr>
  <tr><td><span class="protocol">HTTP</span></td><td>HyperText Transfer Protocol</td><td>Transfers web page data (unencrypted)</td></tr>
  <tr><td><span class="protocol">HTTPS</span></td><td>HTTP Secure</td><td>Encrypted version of HTTP (uses SSL/TLS)</td></tr>
  <tr><td><span class="protocol">FTP</span></td><td>File Transfer Protocol</td><td>Transfers files between computers</td></tr>
  <tr><td><span class="protocol">SMTP</span></td><td>Simple Mail Transfer Protocol</td><td>Sends emails</td></tr>
</table>

<h3>2.6 Step-by-Step: Visiting a Website</h3>
<ol>
  <li>You type a URL in the browser and hit Enter.</li>
  <li>Browser checks <span class="term">DNS</span> to find the website's IP address.</li>
  <li>Browser sends an <span class="protocol">HTTP/HTTPS</span> request to the web server.</li>
  <li>Server processes the request and sends back data (HTML, CSS, images).</li>
  <li>Browser reassembles packets and <span class="def">renders</span> the page on screen.</li>
</ol>

<hr>

<h2>3. Web Browsers</h2>
<p>A <span class="term">web browser</span> is software used to access, retrieve, and display content on the World Wide Web.</p>

<h3>3.1 Functions of a Browser</h3>
<ul>
  <li>Sends requests to web servers (via <span class="protocol">HTTP/HTTPS</span>).</li>
  <li>Interprets and renders <span class="key">HTML, CSS, and JavaScript</span> into visible web pages.</li>
  <li>Manages bookmarks, browsing history, cookies, and cache.</li>
  <li>Supports extensions/add-ons for extra functionality.</li>
  <li>Provides security features (pop-up blockers, private/incognito mode).</li>
</ul>

<h3>3.2 Common Web Browsers</h3>
<p><span class="def">Google Chrome</span> &nbsp;|&nbsp; <span class="def">Mozilla Firefox</span> &nbsp;|&nbsp; <span class="def">Microsoft Edge</span> &nbsp;|&nbsp; <span class="def">Apple Safari</span> &nbsp;|&nbsp; <span class="def">Opera</span> &nbsp;|&nbsp; <span class="def">Brave</span></p>

<h3>3.3 Key Browser Features</h3>
<table>
  <tr><th>Feature</th><th>Description</th></tr>
  <tr><td><span class="key">Address Bar</span></td><td>Where you type URLs or search terms</td></tr>
  <tr><td><span class="key">Tabs</span></td><td>Allow multiple pages open in one window</td></tr>
  <tr><td><span class="key">Bookmarks</span></td><td>Save frequently visited pages</td></tr>
  <tr><td><span class="key">History</span></td><td>Record of previously visited sites</td></tr>
  <tr><td><span class="key">Cache</span></td><td>Temporarily stores data to load pages faster</td></tr>
  <tr><td><span class="key">Cookies</span></td><td>Small files storing user preferences/session data</td></tr>
  <tr><td><span class="key">Incognito Mode</span></td><td>Browses without saving history or cookies</td></tr>
</table>

<hr>

<h2>4. Search Engines</h2>
<p>A <span class="term">search engine</span> is a tool that helps users find information on the Internet by searching a vast index of web pages based on keywords.</p>

<h3>4.1 Popular Search Engines</h3>
<p><span class="def">Google</span> &nbsp;|&nbsp; <span class="def">Bing</span> &nbsp;|&nbsp; <span class="def">Yahoo</span> &nbsp;|&nbsp; <span class="def">DuckDuckGo</span> (privacy-focused)</p>

<h3>4.2 How Search Engines Work</h3>
<ol>
  <li><span class="key">Crawling</span>: Automated bots called <i>spiders</i>/<i>crawlers</i> scan the web, following links.</li>
  <li><span class="key">Indexing</span>: Information is stored in a massive database, organized by keywords and relevance.</li>
  <li><span class="key">Ranking (Algorithm)</span>: Pages ranked by relevance, quality, backlinks, keywords, speed, etc.</li>
  <li><span class="key">Results Display</span>: Returns a <span class="term">SERP</span> (Search Engine Results Page).</li>
</ol>

<h3>4.3 Search Engine vs. Web Browser</h3>
<table>
  <tr><th>Web Browser</th><th>Search Engine</th></tr>
  <tr><td>Software application (e.g., Chrome)</td><td>A website/service (e.g., Google)</td></tr>
  <tr><td>Used to <i>access</i> the Internet</td><td>Used to <i>find</i> information on the Internet</td></tr>
  <tr><td>Can function without a search engine</td><td>Runs <i>inside</i> a browser</td></tr>
</table>

<h3>4.4 Tips for Effective Searching</h3>
<ul>
  <li>Use specific keywords rather than full sentences.</li>
  <li>Use quotation marks <code>" "</code> for exact phrase matches.</li>
  <li>Use a minus sign <code>-word</code> to exclude terms.</li>
  <li>Use <code>site:</code> operator to search within a specific website.</li>
</ul>

<hr>

<h2>5. Role of ISPs (Internet Service Providers)</h2>
<p>An <span class="term">ISP</span> is a company that provides individuals and organizations access to the Internet, along with related services.</p>

<h3>5.1 Core Role</h3>
<p>ISPs act as the <span class="note">gateway</span> connecting a user's device/local network to the wider Internet backbone. Without an ISP, a home computer cannot reach the global network.</p>

<h3>5.2 Key Functions of an ISP</h3>
<ol>
  <li><span class="key">Providing Internet Access</span>: Cable, fiber, DSL, satellite, or wireless connection.</li>
  <li><span class="key">Assigning IP Addresses</span>: Allocates a unique IP address to each user session.</li>
  <li><span class="key">DNS Services</span>: Operates DNS servers to translate domain names.</li>
  <li><span class="key">Bandwidth Management</span>: Controls data speed/capacity per subscription plan.</li>
  <li><span class="key">Network Security</span>: Firewalls, spam filters, malware protection.</li>
  <li><span class="key">Email & Hosting</span>: Some ISPs offer email accounts, hosting, cloud storage.</li>
  <li><span class="key">Technical Support</span>: Assist with connectivity issues.</li>
</ol>

<h3>5.3 Types of Internet Connections</h3>
<table>
  <tr><th>Type</th><th>Description</th><th>Speed</th></tr>
  <tr><td><span class="protocol">Dial-Up</span></td><td>Uses telephone lines (older technology)</td><td class="warning">Very slow</td></tr>
  <tr><td><span class="protocol">DSL</span></td><td>Uses telephone lines, doesn't tie up the line</td><td class="note">Moderate</td></tr>
  <tr><td><span class="protocol">Cable</span></td><td>Uses coaxial TV cables</td><td class="def">Fast</td></tr>
  <tr><td><span class="protocol">Fiber Optic</span></td><td>Uses light signals through fiber cables</td><td class="def">Very fast</td></tr>
  <tr><td><span class="protocol">Satellite</span></td><td>Connects via satellites (remote areas)</td><td class="note">Variable, high latency</td></tr>
  <tr><td><span class="protocol">Wireless/Mobile (4G/5G)</span></td><td>Uses cellular towers</td><td class="def">Fast, portable</td></tr>
</table>

<h3>5.4 Examples of ISPs</h3>
<p><span class="def">Airtel, Jio, BSNL, Vodafone Idea</span> (India) &nbsp;|&nbsp; <span class="def">Comcast, AT&T, Verizon</span> (USA) &nbsp;|&nbsp; <span class="def">BT, Virgin Media</span> (UK)</p>

<h3>5.5 ISP Hierarchy (Tiers)</h3>
<ul>
  <li><span class="key">Tier 1 ISPs</span>: Own massive global backbone networks; don't pay for transit.</li>
  <li><span class="key">Tier 2 ISPs</span>: Regional providers connecting to Tier 1 and peering with other Tier 2s.</li>
  <li><span class="key">Tier 3 ISPs</span>: Local providers serving end users directly (most home ISPs).</li>
</ul>

<hr>

<h2>6. Quick Summary Flow</h2>
<div class="code-block">
User Device (Browser)
        |
        v
   ISP (Local Provider)
        |
        v
  Regional/Backbone Network (Tier 2/Tier 1 ISPs)
        |
        v
  DNS Server (resolves domain name to IP)
        |
        v
   Web Server (hosts the website)
        |
        v
Data sent back as packets --> Reassembled --> Displayed in Browser
</div>

<hr>

<h2>7. Key Terms Glossary</h2>
<table>
  <tr><th>Term</th><th>Meaning</th></tr>
  <tr><td><span class="term">Bandwidth</span></td><td>Maximum data transmittable over a connection in a given time</td></tr>
  <tr><td><span class="term">Latency</span></td><td>Delay before data transfer begins following an instruction</td></tr>
  <tr><td><span class="term">URL</span></td><td>Uniform Resource Locator — the web address of a resource</td></tr>
  <tr><td><span class="term">Packet</span></td><td>A small unit of data transmitted over a network</td></tr>
  <tr><td><span class="term">Router</span></td><td>Device that forwards data packets between networks</td></tr>
  <tr><td><span class="term">Firewall</span></td><td>Security system monitoring/controlling network traffic</td></tr>
  <tr><td><span class="term">Cookie</span></td><td>Small data file stored by a browser to remember user info</td></tr>
  <tr><td><span class="term">Cache</span></td><td>Temporary storage for faster access to frequently used data</td></tr>
</table>

<p style="text-align:center; margin-top:40px; color:#94a3b8;"><i>End of Notes</i></p>

</body>
</html>