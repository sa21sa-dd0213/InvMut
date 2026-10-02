import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should kill mutant m3dd4bb80 by depositing 1 wei and withdrawing", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei from addr1
    const depositTx = await instance.connect(addr1).deposit({ value: 1 });
    await depositTx.wait();

    // Attempt to withdraw all - should succeed on original but fail on mutant
    await expect(instance.connect(addr1).withdrawAll()).to.not.be.reverted;
  });
});