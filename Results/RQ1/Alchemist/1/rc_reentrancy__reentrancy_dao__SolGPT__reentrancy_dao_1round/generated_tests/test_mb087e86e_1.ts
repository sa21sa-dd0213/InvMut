import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant mb087e86e", function () {
  it("should detect balance underflow by depositing 1 wei and withdrawing", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 wei
    const depositTx = await instance.deposit({ value: 1 });
    await depositTx.wait();

    // Try to withdraw - should fail on mutant because balance is 0 but credit is 1
    await expect(instance.withdrawAll()).to.be.reverted;
  });
});