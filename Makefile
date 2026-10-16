.PHONY: test-debug test-docker local udd version-get readme readme-copy release publish-image vhs publish publish-npm

test-debug:
	NO_LOG=1 npx vitest run -t 'code 0'

test-docker:
	docker compose up --exit-code-from test --no-log-prefix --abort-on-container-exit test

local:
	HOST=http://localhost HOST_HTTPBIN=http://localhost:81 npm run test:watch

install:
	npm install -g @garndev/tepi

udd:
	npx npm-check-updates -u && npm test

version-get:
	@node -p "require('./package.json').version"

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
	npm version patch
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

publish-npm:
	npm publish --access public

publish-deno:
	@VERSION=$$(node -p "require('./package.json').version"); \
	echo "Tagging v$$VERSION for deno.land/x..."; \
	git tag v$$VERSION 2>/dev/null || echo "Tag v$$VERSION already exists"; \
	git push origin v$$VERSION

publish: publish-npm
