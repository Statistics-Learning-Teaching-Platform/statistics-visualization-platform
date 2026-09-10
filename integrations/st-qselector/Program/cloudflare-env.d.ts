// Application bindings configured in wrangler.jsonc. OpenNext supplies the
// standard Cloudflare runtime types and this declaration augments its Env.
interface CloudflareEnv {
  HYPERDRIVE: {
    readonly connectionString: string;
  };
}
