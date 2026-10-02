import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m98a88501 test", function () {
  it("should kill the mutant by sending exactly 1 wei and expecting success on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 wei via fallback to simulate prior balance
    const fundTx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: 1 // Send exactly 1 wei
    });
    await fundTx.wait();

    // Now call go() with exactly 1 wei
    // On the original, this would succeed (sends 1 wei to target, then transfers balance to owner)
    // On the mutant, it tries to send 2 wei but only has 1, causing revert
    const goTx = instance.connect(addr1).go({ value: 1 });
    await expect(goTx).to.be.reverted;
  });
});