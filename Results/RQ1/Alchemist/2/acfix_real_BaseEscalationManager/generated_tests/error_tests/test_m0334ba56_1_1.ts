import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m0334ba56", function () {
  it("should return true for isDisputeAllowed on original but false on mutant", async function () {
    // Deploy the contract
    // The constructor requires an OptimisticAsserterInterface address
    // We'll use a zero address since we're not testing assertions
    const [owner] = await ethers.getSigners();
    const optimisticAsserterAddress = ethers.ZeroAddress;

    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(optimisticAsserterAddress);
    await instance.waitForDeployment();

    // Generate a random bytes32 for assertionId
    const assertionId = ethers.hexlify(ethers.randomBytes(32));

    // Call isDisputeAllowed - should return true on original, false on mutant
    const result = await instance.isDisputeAllowed(assertionId, owner.address);

    // This assertion will pass on the original (returns true) and fail on the mutant (returns false)
    expect(result).to.be.true;
  });
});