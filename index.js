const {withUiHook, htm} = require('@vercel/integration-utils');

var QRCode = require('qrcode');

var rawUrl;
var svgDataUrl;


const UrlItem = ({href, data, project, meta}) => {
	// console.log(meta.gitlabCommitMessage);
	let header = htm`<H2>${project} - Default</H2>
	`;
	if(meta.gitlabCommitMessage) {
		header = htm`
		<H2>${project} - ${meta.gitlabCommitRef}</H2>
		<P>Commit: ${meta.gitlabCommitMessage}</P>
		`
	}

	return htm`
		<LI>
		<Fieldset>
  <FsContent>
	${header}
    <Img width="300" height="300" src="${data}" />
  </FsContent>
  <FsFooter>
  <Link href=${href} target="_blank">${href}</Link>
  </FsFooter>
</Fieldset>
		
		</LI>
	`;
}


module.exports = withUiHook(async ({payload, zeitClient}) => {
	const {projectId} = payload;
	var deployments = [];

	let apiUrl = `/v4/projects/?limit=3`;
	// let apiUrl = `/v4/now/deployments/`;
	if (projectId) {
		apiUrl = `/v4/projects/${projectId}`;
		const project = await zeitClient.fetchAndThrow(apiUrl, {method: 'GET'});
		deployments = project.latestDeployments;
		deployments.forEach(d => d.project = project.name);
	} else {
		const {projects} = await zeitClient.fetchAndThrow(apiUrl, {method: 'GET'});

		deployments = projects.reduce((acc,p) => {
			p.latestDeployments.forEach(d => d.project = p.name);

			acc = [...acc, ...p.latestDeployments];

			return acc;
		},[])
	}


	

	// const {deployments}  = await zeitClient.fetchAndThrow(apiUrl, {method: 'GET'});

	const urls = deployments.map(d => `https://${d.url}`);
	let svgUrls = await Promise.all(urls.map(u => {
		return new Promise((resolve,reject) => {
			QRCode.toDataURL(u, (err, svgurl) => {
				resolve(svgurl);
			});
		})
	}));

	// deployments.forEach(dp => {
	// 	Object.keys(dp.meta).forEach(key => {
	// 		console.log(`${key}: ${dp.meta[key]}`);
	// 	})
	// });

	return htm`
		<Page>
			<UL>
				${deployments.map((u) => htm`<${UrlItem} href=${'https://'+u.url} data=${svgUrls[deployments.indexOf(u)]}, meta=${u.meta} project=${u.project} //>`)}
			</UL>
		</Page>
	`
});
