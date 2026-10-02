import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m95593fba detection", function () {
  it("should revert when sending 9 wei to play() in the original, but pass in the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 9 wei (which the mutant accepts, but the original rejects)
    await expect(
      instance.connect(addr1).play({ value: 9 })
    ).to.be.reverted;
  });
});