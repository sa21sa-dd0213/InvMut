import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m0ecbd632 - division instead of subtraction", function () {
  it("should fail on mutant because totalRemaining is incorrectly calculated as division instead of subtraction", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the initial totalRemaining value
    const totalRemaining = await instance.totalRemaining();
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();

    // On original: totalRemaining = totalSupply - totalDistributed = 500000000e18 - 200000000e18 = 300000000e18
    // On mutant: totalRemaining = totalSupply / totalDistributed = 500000000e18 / 200000000e18 = 2 (integer division)
    
    // Verify the mutant has the wrong value
    if (totalRemaining.toString() === "2") {
      // Mutant detected - totalRemaining is 2 instead of 300000000e18
      // This means the division operator was used instead of subtraction
      
      // The getTokens() function requires value <= totalRemaining
      // value = 1000e18, which is far greater than 2, so it should revert
      await expect(
        instance.connect(investor).getTokens()
      ).to.be.reverted;
    } else {
      // Original contract - totalRemaining = 300000000e18
      // value = 1000e18, which is <= totalRemaining, so getTokens() should succeed
      await instance.connect(investor).getTokens();
      
      // Verify investor received tokens
      const balance = await instance.balanceOf(investor.address);
      expect(balance).to.equal(ethers.parseEther("1000"));
    }
  });
});