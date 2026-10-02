import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when play() is called with wrong msg.value (mutant removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call play() with 0 wei (not 10 wei) - should revert in original but pass in mutant
    await expect(
      instance.connect(addr1).play({ value: 0 })
    ).to.be.reverted;
  });
});