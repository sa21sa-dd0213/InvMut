import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - me65dc630", function () {
  it("should kill mutant by verifying distributionFinished is not set prematurely", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribution should succeed
    const tx1 = await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    await tx1.wait();

    // Verify distribution is NOT finished after first distribution (totalDistributed < totalSupply)
    const isFinished = await instance.distributionFinished();
    expect(isFinished).to.equal(false);

    // Second distribution from a different non-blacklisted address should also succeed
    const tx2 = await instance.connect(addr2).getTokens({ value: ethers.parseEther("1") });
    await tx2.wait();

    // If mutant is present, second tx would revert because distributionFinished would be true
    // If original contract, second tx succeeds and distributionFinished remains false
    const isFinishedAfterSecond = await instance.distributionFinished();
    expect(isFinishedAfterSecond).to.equal(false);
  });
});