/**
 * The `publish-script` of `.github/workflows/release.yml`: publishes the current version when npm
 * does not have it yet, tags it when the tag is missing (also for a version published by hand), and
 * reports the tag through `CHANGESETS_OUTPUT` so changesets/action pushes it and cuts the GitHub release.
 */
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Config, Console, Effect, FileSystem, Option, Schema } from "effect"
import { run } from "../src/testing/fixtures.ts"

class ReleaseError extends Schema.TaggedError<ReleaseError>()("@maple-dev/changesets/ReleaseError", {
	message: Schema.String,
}) {}

const Manifest = Schema.Struct({ name: Schema.String, version: Schema.String })

const program = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const { name, version } = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Manifest))(
		yield* fs.readFileString("package.json"),
	)
	const tag = `${name}@${version}`
	const published = yield* run("npm", ["view", `${name}@${version}`, "version"], ".")
	if (published.stdout.trim() === version) {
		yield* Console.log(`${tag} is already on npm.`)
	} else {
		const publish = yield* run("npm", ["publish", "--provenance", "--access", "public"], ".")
		yield* Console.log(publish.stdout)
		if (publish.exitCode !== 0) {
			return yield* new ReleaseError({ message: `npm publish failed:\n${publish.stderr}` })
		}
	}
	// Exit code 2 means the remote has no such tag.
	const remoteTag = yield* run("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], ".")
	if (remoteTag.exitCode === 0) return yield* Console.log(`${tag} is already tagged.`)
	if (remoteTag.exitCode !== 2) {
		return yield* new ReleaseError({ message: `git ls-remote failed:\n${remoteTag.stderr}` })
	}
	const tagged = yield* run("git", ["tag", tag], ".")
	if (tagged.exitCode !== 0) return yield* new ReleaseError({ message: `git tag failed:\n${tagged.stderr}` })
	yield* Console.log(`New tag: ${tag}`)
	const output = yield* Config.option(Config.String("CHANGESETS_OUTPUT"))
	if (Option.isSome(output)) {
		yield* fs.writeFileString(output.value, `${JSON.stringify({ type: "git-tag", tag, packageName: name })}\n`, {
			flag: "a",
		})
	}
})

// Script entry point: the one place the platform layer is provided.
program.pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
