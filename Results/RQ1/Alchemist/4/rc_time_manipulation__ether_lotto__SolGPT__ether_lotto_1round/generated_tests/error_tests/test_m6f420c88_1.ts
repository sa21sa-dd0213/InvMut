import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EtherLotto mutant kill test - m6f420c88", function () {
  it("should revert when calling play() with exact ticket amount and empty pot due to pot + fee exceeding balance", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("0.000000000000000010"); // 10 wei
    const FEE_AMOUNT = ethers.parseEther("0.000000000000000001"); // 1 wei

    // Player sends exactly TICKET_AMOUNT (10 wei) when pot is 0
    // Original: winner gets pot - fee = 10 - 1 = 9 wei, succeeds
    // Mutant: winner gets pot + fee = 10 + 1 = 11 wei, but contract only has 10 wei -> revert
    await expect(
      instance.connect(player).play({ value: TICKET_AMOUNT })
    ).to.be.reverted;
  });
});