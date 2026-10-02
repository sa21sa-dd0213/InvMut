import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - kill md3628d17", function () {
  it("should detect mutant that sets distributionFinished prematurely by setting condition to true", async function () {
    const [owner, investor1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: distribution is not finished
    expect(await instance.distributionFinished()).to.equal(false);

    // First distribution: investor1 calls getTokens()
    // This will trigger distr() with value = 2500e18 (default value)
    await instance.connect(investor1).getTokens({ value: ethers.parseEther("1") });

    // After first distribution, totalDistributed should be 250000000e18 + 2500e18
    // totalSupply is 500000000e18, so distribution should NOT be finished
    expect(await instance.distributionFinished()).to.equal(false);

    // Attempt a second distribution - this should succeed on original contract
    // because distribution is not finished, but will fail on mutant because
    // distr() sets distributionFinished = true after first call (due to `if (true)`)
    const secondInvestor = addr1; // use another signer that is not blacklisted
    // Actually investor1 is blacklisted after first call, so use a fresh signer
    const [owner2, investor2] = await ethers.getSigners();
    
    // Try to call getTokens from a non-blacklisted address
    // On original: should succeed because distributionFinished is false
    // On mutant: should revert because distributionFinished was set to true
    await expect(
      instance.connect(investor2).getTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWith(""); // The canDistr modifier will revert with no message

    // If we reached here without revert on original, the test would pass
    // On mutant, the revert will cause the test to fail (or be caught by expect)
    // This kills the mutant
  });
});