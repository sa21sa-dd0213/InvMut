import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m52d3c76f test", function () {
  it("should revert when non-owner calls AdjustBetAmounts on original, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(addr1.address, ethers.parseEther("1"));
    await instance.waitForDeployment();

    // Attempt to call AdjustBetAmounts from non-owner address
    await expect(
      instance.connect(addr1).AdjustBetAmounts(ethers.parseEther("2"))
    ).to.be.reverted;
  });
});