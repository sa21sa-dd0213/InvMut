import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test for mc1b83fb3", function () {
  it("should detect mutant where >= is replaced with <= in distributionFinished check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state check
    expect(await instance.distributionFinished()).to.equal(false);
    
    // Get initial totalDistributed and totalSupply
    const initialTotalDistributed = await instance.totalDistributed();
    const totalSupply = await instance.totalSupply();
    
    // Calculate how much we need to distribute to exceed totalSupply
    // We need totalDistributed > totalSupply to test the >= vs <= difference
    const remainingToMint = totalSupply - initialTotalDistributed;
    
    // The getTokens function distributes 'value' tokens and then reduces value
    // We need to trigger distribution of enough tokens to exceed totalSupply
    // First, get the current value
    let currentValue = await instance.value();
    
    // Call getTokens multiple times to distribute tokens
    // We need to distribute more than remainingToMint to exceed totalSupply
    let totalDistributedAfter = initialTotalDistributed;
    let iterations = 0;
    const maxIterations = 20;
    
    while (totalDistributedAfter <= totalSupply && iterations < maxIterations) {
      // Send ether to trigger getTokens via receive()
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      });
      
      totalDistributedAfter = await instance.totalDistributed();
      iterations++;
    }
    
    // After the loop, check if distributionFinished is set to true
    // In the original code: if (totalDistributed >= totalSupply) -> sets distributionFinished = true
    // In the mutant: if (totalDistributed <= totalSupply) -> would NOT set it when totalDistributed > totalSupply
    const finalTotalDistributed = await instance.totalDistributed();
    const finalDistributionFinished = await instance.distributionFinished();
    
    // The original code would set distributionFinished = true when totalDistributed >= totalSupply
    // The mutant would NOT set it when totalDistributed > totalSupply (only when <=)
    // So if we exceeded totalSupply, the original would have set it, but mutant wouldn't
    expect(finalTotalDistributed).to.be.gt(totalSupply);
    expect(finalDistributionFinished).to.equal(true, "Distribution should be finished when totalDistributed exceeds totalSupply");
    
    // Additional verification: try calling getTokens again - should revert if distribution is finished
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;
  });
});