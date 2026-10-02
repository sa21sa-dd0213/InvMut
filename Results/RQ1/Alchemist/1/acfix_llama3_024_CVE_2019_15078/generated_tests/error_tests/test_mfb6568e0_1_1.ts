import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant mfb6568e0", function () {
  it("should detect when distributionFinished is not set to true when totalDistributed equals totalSupply", async function () {
    const [owner, investor1, investor2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial setup: owner has totalDistributed tokens (200,000,000e18)
    // totalRemaining = 300,000,000e18
    // value = 1000e18 per distribution

    // Create enough accounts to perform the distributions
    const investors = [];
    for (let i = 0; i < 10; i++) {
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1.0")
      });
      investors.push(wallet);
    }

    // Distribute tokens using multiple investors
    for (let i = 0; i < 300000; i++) {
      const investorIndex = i % 10;
      const investor = investors[investorIndex];
      
      // Check if we've reached exactly totalSupply
      const totalDistributed = await instance.totalDistributed();
      const totalSupply = await instance.totalSupply();
      
      if (totalDistributed >= totalSupply) {
        break;
      }
      
      // Get the current value
      const currentValue = await instance.value();
      
      // Check if this distribution would exceed totalSupply
      if (totalDistributed + currentValue > totalSupply) {
        // This would be the last distribution
        break;
      }
      
      try {
        await instance.connect(investor).getTokens();
      } catch {
        break;
      }
    }

    // Now check that totalDistributed equals totalSupply
    const finalTotalDistributed = await instance.totalDistributed();
    const finalTotalSupply = await instance.totalSupply();
    
    expect(finalTotalDistributed).to.equal(finalTotalSupply);
    
    // Verify distributionFinished is true
    expect(await instance.distributionFinished()).to.be.true;
    
    // Attempt one more distribution - should fail if mutant is killed
    // If mutant is present, this distribution will succeed (bug)
    // If original code, this should revert
    const newInvestor = ethers.Wallet.createRandom().connect(ethers.provider);
    await owner.sendTransaction({
      to: newInvestor.address,
      value: ethers.parseEther("1.0")
    });
    
    // This should revert in original code (distributionFinished = true)
    // In mutant, it might succeed because condition is > not >=
    await expect(
      instance.connect(newInvestor).getTokens()
    ).to.be.reverted;
  });
});