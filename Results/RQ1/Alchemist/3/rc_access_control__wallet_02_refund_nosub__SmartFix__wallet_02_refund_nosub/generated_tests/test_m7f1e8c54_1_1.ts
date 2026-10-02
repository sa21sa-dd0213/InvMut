import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow partial withdrawal (mutant kill test for withdraw amount == balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw only 0.5 ether (partial amount)
    const partialWithdraw = ethers.parseEther("0.5");

    // On original contract this succeeds; on mutant it should revert
    await expect(
      instance.connect(addr1).withdraw(partialWithdraw)
    ).to.not.be.reverted;

    // Verify balance is reduced correctly by checking remaining balance via getter
    // Note: The contract doesn't have a public getter, but we can check by trying to withdraw
    // the remaining 0.5 ether and it should succeed
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});