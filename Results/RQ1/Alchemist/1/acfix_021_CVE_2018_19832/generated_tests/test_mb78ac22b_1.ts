import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant mb78ac22b (division instead of subtraction in totalRemaining)", function () {
  it("should kill mutant by calling getTokens() which fails because totalRemaining is too small", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract: totalRemaining = totalSupply - totalDistributed = 500M - 250M = 250M tokens (in wei equivalent)
    // In the mutant: totalRemaining = totalSupply / totalDistributed = 500M / 250M = 2 tokens (in wei equivalent)
    // The default value is 2500e18, which is far larger than 2e18 (mutant totalRemaining)
    // So calling getTokens() should revert on the mutant but succeed on the original

    // Fund the investor with some ETH to call getTokens() (which is payable)
    await owner.sendTransaction({
      to: investor.address,
      value: ethers.parseEther("1")
    });

    // Attempt to call getTokens() - this should revert on the mutant because value (2500e18) > totalRemaining (2e18)
    await expect(
      instance.connect(investor).getTokens({ value: ethers.parseEther("0.001") })
    ).to.be.reverted;

    // Additional verification: check that totalRemaining is indeed very small on the mutant
    const totalRemaining = await instance.totalRemaining();
    // On mutant: totalRemaining should be 2e18 (since 500M / 250M = 2)
    // On original: totalRemaining should be 250000000e18
    expect(totalRemaining).to.equal(ethers.parseEther("2"));
  });
});