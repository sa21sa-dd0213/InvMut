import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection test", function () {
  it("should revert when sending less than TICKET_AMOUNT (mutant allows <= instead of ==)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei which is less than TICKET_AMOUNT (10 wei)
    // Original contract requires exact equality (==), so it should revert
    // Mutant allows <=, so it would NOT revert - this test will fail on the mutant
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 1
      })
    ).to.be.reverted;
  });
});