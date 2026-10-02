import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow withdrawal of amount less than balance (kills mutant where >= replaces <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw 0.5 ether (less than balance) - should succeed in original, fail in mutant
    const withdrawAmount = ethers.parseEther("0.5");
    await expect(instance.connect(addr1).withdraw(withdrawAmount)).to.not.be.reverted;
  });
});