import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test for m87419d75", function () {
  it("should allow multiple getTokens calls until totalDistributed reaches totalSupply", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalDistributed = 250000000e18, totalSupply = 500000000e18
    // value = 2500e18 initially

    // First distribution from addr1
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // After first distribution, distributionFinished should NOT be true yet
    // because totalDistributed is still less than totalSupply
    // (250000000e18 + 2500e18 = 250002500e18 < 500000000e18)

    // Attempt second distribution from addr2 - should succeed in original but fail in mutant
    // because mutant sets distributionFinished = true prematurely
    await expect(
      instance.connect(addr2).getTokens({ value: ethers.parseEther("1") })
    ).to.not.be.reverted;

    // Verify distributionFinished is still false
    const finished = await instance.distributionFinished();
    expect(finished).to.equal(false);
  });
});