import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - mb79a36e5", function () {
  it("should revert when calling play() with value greater than TICKET_AMOUNT (original uses ==, mutant uses >=)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n; // as defined in contract

    // Attempt to call play() with more than the exact ticket amount (e.g., 20 wei)
    // Original contract requires exactly 10 wei (==), so this should revert
    // Mutant accepts >= 10 wei, so this would succeed - killing the mutant
    await expect(
      instance.connect(player).play({ value: TICKET_AMOUNT * 2n }) // 20 wei
    ).to.be.reverted;
  });
});