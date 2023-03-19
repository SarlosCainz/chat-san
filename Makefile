.PHONY: deploy deploy_lambda deploy_ui build_ui

PROFILE := daigo

#deploy: sync deploy_ui deploy_lambda

deploy_lambda:
	sls --aws-profile ${PROFILE} deploy --stage dev
deploy_ui: build_ui
	cd ui/dist &&  aws s3 sync --delete . s3://loaned-items-checker/html/ --profile ${PROFILE}
	aws cloudfront create-invalidation --distribution-id E1TJ57IUL6HNW6 --paths /index.html --profile ${PROFILE}
build_ui:
	cd ui && npm run build
