import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant mcecd0df1", function () {
  it("should revert when getTokens() is called after distribution is finished, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, finish the distribution so distributionFinished = true
    const tx = await instance.connect(owner).finishDistribution();
    await tx.wait();

    // Now try to call getTokens() from a non-blacklisted address
    // In the original contract, this should revert because distributionFinished is true
    // In the mutant (without the require check), it will succeed, thus killing the mutant
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});