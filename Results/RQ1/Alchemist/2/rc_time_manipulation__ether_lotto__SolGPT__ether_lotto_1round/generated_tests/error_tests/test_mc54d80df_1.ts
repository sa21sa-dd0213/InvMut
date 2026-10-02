import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should revert when sending exactly 10 wei (original required amount) after mutant changes requirement to 11 wei", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.value == 10) to require(msg.value - 1 == 10)
    // which means msg.value must now be 11 instead of 10.
    // Sending exactly 10 wei should fail on the mutant but pass on the original.
    await expect(
      instance.connect(player).play({ value: 10 })
    ).to.be.reverted;
  });
});