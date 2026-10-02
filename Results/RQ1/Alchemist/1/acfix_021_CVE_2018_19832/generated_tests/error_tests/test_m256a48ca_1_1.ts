import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m256a48ca - blacklist on zero value", function () {
  it("should not blacklist investor when toGive is 0, but mutant incorrectly blacklists", async function () {
    const [owner, investor] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    // First, drain totalRemaining to make value become 0
    // Get initial totalRemaining
    let totalRemaining = await contract.totalRemaining();
    
    // Calculate how many calls needed to drain totalRemaining
    // Each call distributes value tokens and reduces value by 0.001%
    let value = await contract.value();
    
    // Make enough calls from owner to drain totalRemaining
    while (totalRemaining > 0 && value > 0) {
      // Call getTokens as owner (owner is not blacklisted initially)
      await contract.connect(owner).getTokens();
      totalRemaining = await contract.totalRemaining();
      value = await contract.value();
    }

    // Verify value is now 0
    value = await contract.value();
    expect(value).to.equal(0);

    // Now call getTokens from investor - toGive will be 0
    await contract.connect(investor).getTokens();

    // In original: investor should NOT be blacklisted because toGive was 0
    // In mutant: investor IS blacklisted because condition is always true
    // Try calling getTokens again - should succeed in original, revert in mutant
    const investorBlacklisted = await contract.blacklist(investor.address);
    
    // If blacklisted (mutant), the second call will revert
    // If not blacklisted (original), it will succeed
    if (investorBlacklisted) {
      // Mutant detected - investor is incorrectly blacklisted
      await expect(
        contract.connect(investor).getTokens()
      ).to.be.reverted;
    } else {
      // Original behavior - investor not blacklisted, second call succeeds
      await contract.connect(investor).getTokens();
    }
  });
});