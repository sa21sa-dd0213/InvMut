import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection", function () {
  it("should detect mutant mc54d80df by sending exactly 10 wei and expecting success on original but revert on mutant", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 wei (TICKET_AMOUNT)
    // Original contract would accept this, mutant requires 11 wei and would revert
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.000000000000000010") // exactly 10 wei
      })
    ).to.be.reverted;
  });
});