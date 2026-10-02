import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - m6f420c88", function () {
  it("should revert when trying to pay player more than pot (pot + fee) due to arithmetic mutation", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Player plays and sends exactly TICKET_AMOUNT
    const tx = player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT,
      data: instance.interface.encodeFunctionData("play")
    });

    // The original contract would succeed (player gets pot - fee = 9 ether)
    // The mutant tries to send pot + fee = 11 ether, but contract only has 10 ether
    // This causes a revert because the transfer fails
    await expect(tx).to.be.reverted;
  });
});