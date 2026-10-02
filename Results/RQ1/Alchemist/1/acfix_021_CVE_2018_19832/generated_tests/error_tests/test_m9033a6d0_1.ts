import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - m9033a6d0", function () {
  it("should set distributionFinished when totalDistributed exceeds totalSupply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 250000000e18, totalSupply = 500000000e18
    // We need to make totalDistributed exceed totalSupply
    // value starts at 2500e18, and decreases each call
    
    // First, let's check initial values
    expect(await instance.distributionFinished()).to.equal(false);
    
    // Calculate how many calls needed to exceed totalSupply
    // totalDistributed starts at 250000000e18, totalSupply is 500000000e18
    // We need to distribute > 250000000e18 more
    // Each call distributes value which decreases by factor of 99999/100000 each time
    
    // Let's make many calls to distribute enough tokens to exceed totalSupply
    // We'll use multiple addresses to avoid blacklist issues
    const addresses = [addr1, addr2];
    
    for (let i = 0; i < 100; i++) {
      const currentAddr = addresses[i % 2];
      
      // Check if we can still call getTokens (distribution not finished)
      const isFinished = await instance.distributionFinished();
      if (isFinished) break;
      
      // Check if the address is blacklisted
      const isBlacklisted = await instance.blacklist(currentAddr.address);
      if (isBlacklisted) continue;
      
      try {
        // Send ETH to trigger getTokens via receive()
        await owner.sendTransaction({
          to: await instance.getAddress(),
          value: ethers.parseEther("0.001")
        });
      } catch (e) {
        // If transaction reverts, distribution might be finished or value is 0
        break;
      }
    }
    
    // Verify that distributionFinished is true after totalDistributed exceeds totalSupply
    const finalDistributed = await instance.totalDistributed();
    const totalSupply = await instance.totalSupply();
    
    // Assert that totalDistributed exceeded or equaled totalSupply
    expect(finalDistributed).to.be.gte(totalSupply);
    
    // This is the key assertion: distributionFinished must be true
    // The mutant would fail this because it only sets finished when totalDistributed == totalSupply
    // but not when totalDistributed > totalSupply
    expect(await instance.distributionFinished()).to.equal(true);
  });
});