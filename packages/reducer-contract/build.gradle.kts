import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("dreamboard.kotlin-jvm")
    alias(libs.plugins.kotlin.serialization)
    `java-library`
}

group = "com.dreamboard"
version = "1.0.0"

val generatedKotlinDir = layout.buildDirectory.dir("generated-src/main/kotlin")
val checkedInKotlinDir = layout.projectDirectory.dir("src/checked-in/kotlin")

sourceSets {
    named("main") {
        kotlin.srcDir(checkedInKotlinDir)
    }
}

// The single source of truth is the JSON Schema; a small Node.js script
// emits Kotlin. We invoke it via Gradle so the generated code is always in
// sync with the schema on every build.
val generateKotlinContract by tasks.registering(Exec::class) {
    group = "code generation"
    description = "Generate Kotlin classes from reducer-runtime.schema.json"

    val schemaFile = file("schema/reducer-runtime.schema.json")
    val operationsFile = file("schema/reducer-runtime.operations.json")
    val scriptFile = file("scripts/generate-kotlin.mjs")
    val packageJsonFile = file("package.json")

    inputs.file(schemaFile)
    inputs.file(operationsFile)
    inputs.file(scriptFile)
    inputs.file(packageJsonFile)
    outputs.dir(generatedKotlinDir)

    workingDir = projectDir
    commandLine("node", scriptFile.absolutePath)
}

val validateCheckedInReducerContract by tasks.registering {
    group = "verification"
    description = "Validate checked-in reducer contract Kotlin sources exist for builds that skip Node codegen"

    val checkedInContractFile =
        checkedInKotlinDir.file("com/dreamboard/reducer/contract/ReducerContract.kt")

    inputs.file(checkedInContractFile)

    doLast {
        require(checkedInContractFile.asFile.isFile) {
            "Missing checked-in reducer contract at ${checkedInContractFile.asFile.relativeTo(rootProject.projectDir)}"
        }
    }
}

tasks.withType<KotlinCompile>().configureEach {
    dependsOn(validateCheckedInReducerContract)
}

dependencies {
    implementation(kotlin("reflect"))
    implementation(libs.kotlinx.serialization.core)
    implementation(libs.kotlinx.serialization.json)

    testImplementation(kotlin("test"))
    testImplementation(libs.assertj)
    testImplementation(libs.kotlinx.coroutines.test)
}
