import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m8befd116", function () {
  it("should detect mutant that changes keccak256 to sha256 for TIMELOCK_ADMIN_ROLE", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy the TimelockController with required constructor arguments
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    // The mutant computes TIMELOCK_ADMIN_ROLE using sha256 instead of keccak256
    // We need to compute what the original keccak256-based role hash would be
    const originalRoleHash = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));

    // In the original contract, owner would have TIMELOCK_ADMIN_ROLE from constructor
    // In the mutant, the role is computed with sha256, so the original keccak256-based hash won't match

    // Attempt to use the original keccak256-based role to check if owner has admin role
    // In the original contract this should return true, in the mutant it will return false
    const hasRole = await timelock.hasRole(originalRoleHash, owner.address);

    // The mutant will have a different role hash, so the owner won't have the role
    // when checked with the original keccak256-based hash
    expect(hasRole).to.equal(false);

    // Additionally, verify that the actual role used in the contract is different
    // by computing the sha256 version
    const mutantRoleHash = ethers.sha256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const hasMutantRole = await timelock.hasRole(mutantRoleHash, owner.address);

    // In the mutant, owner should have the sha256-based role
    expect(hasMutantRole).to.equal(true);

    // This confirms the hash function was changed
    expect(originalRoleHash).to.not.equal(mutantRoleHash);
  });
});