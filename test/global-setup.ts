// vitest globalSetup: starts local mock servers for the hosts the .http fixtures need,
// because the default public hosts are dead/unreliable (faker.deno.dev sunset).
// Sets HOST / HOST_HTTPBIN so fixtures/templates and the CLI subprocess pick them up.
import { startFakerServer, startHttpbinLikeServer } from "./faker.mock.mjs";

export default function globalSetup() {
  return new Promise((resolveSetup) => {
    const faker = startFakerServer(0);
    const httpbin = startHttpbinLikeServer(0);

    faker.listen(0, () => {
      httpbin.listen(0, () => {
        const addr = (s) => (typeof s.address() === "object" ? s.address().port : 8000);
        process.env.HOST = `http://localhost:${addr(faker)}/pong`;
        process.env.HOST_HTTPBIN = `http://localhost:${addr(httpbin)}`;
        resolveSetup(() => {
          faker.close();
          httpbin.close();
          delete process.env.HOST;
          delete process.env.HOST_HTTPBIN;
        });
      });
    });
  });
}
