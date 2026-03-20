.PHONY: test-debug test-docker local compile install-x udd dnt version version-get readme readme-copy release publish-image vhs

test-debug:
	NO_LOG=1 npx vitest run -t 'code 0'

test-docker:
	docker compose up --exit-code-from test --no-log-prefix --abort-on-container-exit test

local:
	HOST=http://localhost HOST_HTTPBIN=http://localhost:81 npm run test:watch

compile:
	deno compile --output=dist/tepi -A src/cli.ts

install-x:
	npm install -g @garn/tepi

udd:
	npx npm-check-updates -u && npm test

dnt:
	deno run -A https://deno.land/x/dnt_prompt/main.ts

version:
	deno run --allow-all jsr:@krlwlfrt/version

version-get:
	@$(MAKE) --silent version | jq '.["@garn/tepi"]' | sed 's/"//g'

readme:
	cat docs/started.md > README.md
	cat docs/usage.md >> README.md
	cat docs/syntax.md >> README.md
	$(MAKE) readme-copy
	git add README.md vscode-extension/README.md
	git commit -m 'docs: update README.md' || true

readme-copy:
	cp README.md vscode-extension/README.md

release:
	$(MAKE) vhs
	$(MAKE) readme
	deno run --allow-all jsr:@krlwlfrt/version patch
	git push --tags origin main
	$(MAKE) publish-image

publish-image:
	IMAGE_NAME=jupegarnica/tepi; \
	IMAGE_TAG=$$($(MAKE) --silent version-get); \
	docker build -t $$IMAGE_NAME:$$IMAGE_TAG . && \
	docker push $$IMAGE_NAME:$$IMAGE_TAG && \
	docker tag $$IMAGE_NAME:$$IMAGE_TAG $$IMAGE_NAME:latest && \
	docker push $$IMAGE_NAME:latest

vhs:
	cd vhs && vhs < demo.tape && git add ./demo.gif && git commit -m vhs
