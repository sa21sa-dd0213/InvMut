import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m621e08df (totalDistributed subtraction bug)", function () {
  it("should detect mutant that uses subtraction instead of addition in distr", async function () {
    const [owner, investor] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed should be 250000000e18 (set in contract)
    const initialTotalDistributed = await instance.totalDistributed();

    // Fund contract with some ETH so getTokens() can succeed (value = 2500e18)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0") // small amount to trigger distribution
    });

    // Call getTokens() from investor address (not blacklisted, distribution not finished)
    // This will internally call distr which should increase totalDistributed
    await instance.connect(investor).getTokens();

    // Get new totalDistributed after the distribution
    const newTotalDistributed = await instance.totalDistributed();

    // In the original contract: totalDistributed should increase
    // In the mutant: totalDistributed will decrease (subtraction instead of addition)
    // We expect the original behavior: newTotalDistributed > initialTotalDistributed
    expect(newTotalDistributed).to.be.gt(initialTotalDistributed);
  });
});