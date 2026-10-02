import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m2bb2bf44", function () {
  it("should set distributionFinished to true when totalDistributed >= totalSupply", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial state
    const totalSupply = await instance.totalSupply();
    const totalDistributed = await instance.totalDistributed();
    const value = await instance.value();

    // Calculate how much more needs to be distributed to reach totalSupply
    const remaining = totalSupply - totalDistributed;

    // The getTokens function distributes 'value' tokens per call
    // We need to make multiple calls to distribute enough tokens
    let currentDistributed = totalDistributed;
    let currentValue = value;

    while (currentDistributed < totalSupply) {
      // Check if we have enough ETH for the current value
      const ethValue = ethers.parseEther("0.1");

      // Send ETH to trigger getTokens via receive()
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethValue
      });

      // Update state
      currentDistributed = await instance.totalDistributed();
      currentValue = await instance.value();
    }

    // Now totalDistributed should be >= totalSupply
    // Check that distributionFinished is true
    const finished = await instance.distributionFinished();
    expect(finished).to.equal(true);
  });
});