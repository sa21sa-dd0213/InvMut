import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mcfaf3545 - withdraw >= instead of <=", function () {
  it("should revert when withdrawing less than balance (mutant requires amount >= balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 deposits 1 ether
    await instance.connect(addr1).deposit({ value: ethers.parseEther("1") });

    // addr1 tries to withdraw 0.5 ether (less than balance)
    // Original: succeeds; Mutant: reverts because 0.5 < 1.0
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});