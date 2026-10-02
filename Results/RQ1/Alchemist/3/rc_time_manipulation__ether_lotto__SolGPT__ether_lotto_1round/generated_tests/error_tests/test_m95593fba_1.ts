import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test", function () {
  it("should revert when sending exactly 10 wei (TICKET_AMOUNT) to the mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant requires msg.value + 1 == 10, meaning it expects 9 wei
    // Sending exactly 10 wei should fail on the mutant because 10 + 1 = 11 != 10
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.000000000000000010") // exactly 10 wei
      })
    ).to.be.reverted;
  });
});