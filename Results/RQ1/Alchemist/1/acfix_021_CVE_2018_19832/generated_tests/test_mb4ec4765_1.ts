import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant detection - distr condition change", function () {
  it("should kill mutant by showing distribution continues when totalDistributed < totalSupply", async function () {
    const [owner, investor1, investor2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set initial state: fund contract with ETH for distribution
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // First distribution - investor1 gets tokens
    await instance.connect(investor1).getTokens({ value: ethers.parseEther("1") });
    
    // Check that distributionFinished is still false (totalDistributed < totalSupply)
    expect(await instance.distributionFinished()).to.equal(false);
    
    // Second distribution attempt - investor2 should still be able to get tokens
    // In original: succeeds because distributionFinished is false
    // In mutant: would revert because mutant sets distributionFinished = true prematurely
    await expect(
      instance.connect(investor2).getTokens({ value: ethers.parseEther("1") })
    ).to.not.be.reverted;
    
    // Verify investor2 actually received tokens
    const investor2Balance = await instance.balanceOf(investor2.address);
    expect(investor2Balance).to.be.gt(0);
  });
});