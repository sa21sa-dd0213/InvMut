import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m6f420c88", function () {
  it("should revert when winner tries to receive more than contract balance (mutant adds instead of subtracts)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player sends exactly 10 ether to play
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT,
    });

    // In the mutant, if random == 0, the contract tries to send pot + FEE_AMOUNT (11 ether)
    // but only has 10 ether, so it should revert
    await expect(tx).to.be.reverted;
  });
});