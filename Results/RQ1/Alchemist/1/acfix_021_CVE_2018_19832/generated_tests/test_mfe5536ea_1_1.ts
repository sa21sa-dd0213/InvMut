import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mfe5536ea test", function () {
  it("should detect that distributionFinished is prematurely set to true when totalDistributed < totalSupply", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 250000000e18, totalSupply = 500000000e18
    // value = 2500e18, so first getTokens() will distribute 2500e18 tokens
    // After first call: totalDistributed = 250000002500e18, still far below totalSupply
    
    // Fund the contract with some ETH to allow getTokens() to be called
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // First call should succeed and not set distributionFinished
    await instance.connect(investor).getTokens({ value: ethers.parseEther("0.001") });
    
    // After first call, distributionFinished should still be false because totalDistributed << totalSupply
    expect(await instance.distributionFinished()).to.be.false;
    
    // Second call should also succeed (distribution not finished)
    await expect(
      instance.connect(investor).getTokens({ value: ethers.parseEther("0.001") })
    ).to.not.be.reverted;
    
    // Verify distributionFinished is still false
    expect(await instance.distributionFinished()).to.be.false;
  });
});