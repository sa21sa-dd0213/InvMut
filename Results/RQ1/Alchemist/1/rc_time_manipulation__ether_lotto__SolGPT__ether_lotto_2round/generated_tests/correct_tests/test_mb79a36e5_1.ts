import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - mb79a36e5", function () {
  it("should revert when sending more than TICKET_AMOUNT (mutant uses >= instead of ==)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("0.000000000000000010"); // 10 wei
    const excessAmount = ethers.parseEther("0.000000000000000015"); // 15 wei

    // Original contract requires exact 10 wei; mutant accepts >= 10 wei
    // Sending 15 wei should revert in original, but succeed in mutant
    // To kill the mutant, we expect revert
    await expect(
      instance.connect(player).play({ value: excessAmount })
    ).to.be.reverted;
  });
});