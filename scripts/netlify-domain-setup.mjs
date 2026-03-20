#!/usr/bin/env node
/* global fetch, console, process */
/**
 * Script to check and configure custom domain on Netlify site
 * Uses the Netlify CLI's stored auth token
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SITE_ID = 'e1b0bd1c-9f72-4267-9d13-a935565a317c';
const DOMAIN = 'sunuyoon.net';
const WWW_DOMAIN = 'www.sunuyoon.net';

// Read Netlify auth token from config
function getToken() {
  const configPath = join(homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json');
  if (!existsSync(configPath)) {
    // Try alternate location
    const altPath = join(homedir(), '.netlify', 'config.json');
    if (existsSync(altPath)) {
      const cfg = JSON.parse(readFileSync(altPath, 'utf8'));
      return cfg.users?.[cfg.userId]?.auth?.token;
    }
    throw new Error('Netlify config not found. Run "npx netlify login" first.');
  }
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  return cfg.users?.[cfg.userId]?.auth?.token;
}

async function api(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, opts);
  const text = await res.text();
  if (!res.ok) {
    console.error(`API ${method} ${path} => ${res.status}: ${text}`);
    return null;
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log('=== Netlify Domain Setup for sunuyoon.net ===\n');

  // 1. Get current site info
  console.log('1) Fetching site info...');
  const site = await api('GET', `/sites/${SITE_ID}`);
  if (!site) { console.error('Failed to fetch site'); process.exit(1); }
  
  console.log(`   Site name: ${site.name}`);
  console.log(`   Default URL: ${site.ssl_url || site.url}`);
  console.log(`   Custom domain: ${site.custom_domain || '(none)'}`);
  console.log(`   Domain aliases: ${JSON.stringify(site.domain_aliases || [])}`);
  console.log(`   Managed DNS: ${site.managed_dns ? 'Yes' : 'No'}`);
  console.log(`   SSL: ${site.ssl ? 'Yes' : 'No'}`);
  console.log(`   Force SSL: ${site.force_ssl ? 'Yes' : 'No'}`);
  console.log();

  // 2. Set custom domain if not already set
  if (site.custom_domain !== DOMAIN) {
    console.log(`2) Setting custom domain to ${DOMAIN}...`);
    const updated = await api('PATCH', `/sites/${SITE_ID}`, {
      custom_domain: DOMAIN,
    });
    if (updated) {
      console.log(`   ✓ Custom domain set to: ${updated.custom_domain}`);
    }
  } else {
    console.log(`2) Custom domain already set to ${DOMAIN} ✓`);
  }

  // 3. Check/add www alias
  const aliases = site.domain_aliases || [];
  if (!aliases.includes(WWW_DOMAIN)) {
    console.log(`3) Adding ${WWW_DOMAIN} as domain alias...`);
    const newAliases = [...aliases, WWW_DOMAIN];
    const updated = await api('PATCH', `/sites/${SITE_ID}`, {
      domain_aliases: newAliases,
    });
    if (updated) {
      console.log(`   ✓ Domain aliases: ${JSON.stringify(updated.domain_aliases)}`);
    }
  } else {
    console.log(`3) www alias already configured ✓`);
  }

  // 4. Check DNS zone
  console.log('\n4) Checking DNS zones...');
  const zones = await api('GET', `/dns_zones?site_id=${SITE_ID}`);
  if (zones && zones.length > 0) {
    for (const zone of zones) {
      console.log(`   Zone: ${zone.name} (ID: ${zone.id})`);
      console.log(`   DNS servers: ${JSON.stringify(zone.dns_servers)}`);
      
      // Get DNS records
      const records = await api('GET', `/dns_zones/${zone.id}/dns_records`);
      if (records) {
        console.log(`   Records (${records.length}):`);
        for (const r of records) {
          console.log(`     ${r.type}\t${r.hostname}\t→\t${r.value}\t(TTL: ${r.ttl})`);
        }
      }
    }
  } else {
    console.log('   No DNS zones found for this site.');
    console.log('   Attempting to create Netlify DNS zone...');
    const newZone = await api('POST', '/dns_zones', {
      name: DOMAIN,
      site_id: SITE_ID,
    });
    if (newZone) {
      console.log(`   ✓ DNS zone created: ${newZone.name}`);
      console.log(`   DNS servers: ${JSON.stringify(newZone.dns_servers)}`);
    }
  }

  // 5. Enable SSL
  console.log('\n5) Checking/provisioning SSL...');
  const sslCert = await api('GET', `/sites/${SITE_ID}/ssl`);
  if (sslCert) {
    console.log(`   SSL state: ${sslCert.state}`);
    console.log(`   SSL domains: ${JSON.stringify(sslCert.domains)}`);
    console.log(`   Expires: ${sslCert.expires_at}`);
    
    if (sslCert.state !== 'created' && sslCert.state !== 'custom') {
      console.log('   Provisioning new SSL certificate...');
      const newSSL = await api('POST', `/sites/${SITE_ID}/ssl`, {
        certificate: '',
        key: '',
        ca_certificates: '',
      });
      if (newSSL) {
        console.log(`   ✓ SSL provisioned, state: ${newSSL.state}`);
      }
    }
  } else {
    console.log('   Provisioning SSL certificate...');
    const newSSL = await api('POST', `/sites/${SITE_ID}/ssl`);
    if (newSSL) {
      console.log(`   ✓ SSL provisioned, state: ${newSSL.state}`);
    }
  }

  // 6. Force SSL
  console.log('\n6) Ensuring Force SSL is enabled...');
  if (!site.force_ssl) {
    const updated = await api('PATCH', `/sites/${SITE_ID}`, {
      force_ssl: true,
    });
    if (updated && updated.force_ssl) {
      console.log('   ✓ Force SSL enabled');
    }
  } else {
    console.log('   Force SSL already enabled ✓');
  }

  // 7. Final check
  console.log('\n7) Final site state...');
  const finalSite = await api('GET', `/sites/${SITE_ID}`);
  if (finalSite) {
    console.log(`   Name: ${finalSite.name}`);
    console.log(`   URL: ${finalSite.ssl_url || finalSite.url}`);
    console.log(`   Custom domain: ${finalSite.custom_domain}`);
    console.log(`   Domain aliases: ${JSON.stringify(finalSite.domain_aliases)}`);
    console.log(`   SSL: ${finalSite.ssl}`);
    console.log(`   Force SSL: ${finalSite.force_ssl}`);
    console.log(`   Published deploy: ${finalSite.published_deploy?.id || 'N/A'}`);
  }

  console.log('\n=== Done! ===');
  console.log(`\nYour site should be accessible at:`);
  console.log(`  https://sunuyoon.net`);
  console.log(`  https://www.sunuyoon.net`);
  console.log(`  https://sunu-yoon-demo-2025.netlify.app`);
}

main().catch(err => { console.error(err); process.exit(1); });
