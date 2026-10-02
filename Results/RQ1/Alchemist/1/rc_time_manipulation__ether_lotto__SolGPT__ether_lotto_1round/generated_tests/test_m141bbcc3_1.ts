import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m141bbcc3", function () {
  it("should revert when sending less than TICKET_AMOUNT (10 wei)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to play with 5 wei (less than required 10)
    await expect(
      instance.connect(player).play({ value: 5 })
    ).to.be.reverted;
  });
});