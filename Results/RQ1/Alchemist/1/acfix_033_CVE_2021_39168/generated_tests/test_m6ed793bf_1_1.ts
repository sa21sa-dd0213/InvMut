import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m6ed793bf detection", function () {
  it("should detect mutant by verifying isOperationDone returns false for non-existent operation", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      3600, // minDelay
      [],   // proposers (empty)
      []    // executors (empty)
    );
    await instance.waitForDeployment();

    // Generate a hash for a non-existent operation (never scheduled)
    const nonExistentId = ethers.keccak256(
      ethers.toUtf8Bytes("non-existent-operation")
    );

    // In the original contract, this should return false
    // In the mutant, it incorrectly returns true because timestamp 0 <= 1
    expect(await instance.isOperationDone(nonExistentId)).to.equal(false);
  });
});