import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperation", function () {
  it("should kill the mutant by verifying keccak256 is used instead of sha256", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with minimal constructor args
    const minDelay = 3600; // 1 hour
    const proposers: string[] = [owner.address];
    const executors: string[] = [owner.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Test parameters
    const target = ethers.ZeroAddress;
    const value = 0n;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Compute expected hash using keccak256 (as in original)
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes", "bytes32", "bytes32"],
      [target, value, data, predecessor, salt]
    );
    const expectedHash = ethers.keccak256(encoded);

    // Call the contract's hashOperation function
    const actualHash = await instance.hashOperation(target, value, data, predecessor, salt);

    // Assert that the hash matches keccak256 - this will fail on the mutant
    // because the mutant uses sha256 instead
    expect(actualHash).to.equal(expectedHash);
  });
});