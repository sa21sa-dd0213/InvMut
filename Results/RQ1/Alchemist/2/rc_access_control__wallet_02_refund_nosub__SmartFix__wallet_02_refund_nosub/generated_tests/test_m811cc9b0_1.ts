import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when withdrawing more than balance (kills mutant that removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 10 wei from addr1
    const depositAmount = ethers.parseEther("0.00000000000000001"); // 10 wei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw 100 wei (more than deposited)
    const withdrawAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;

    // Verify balance remains unchanged
    const contractBalance = await ethers.provider.getBalance(instance.target);
    expect(contractBalance).to.equal(depositAmount);
  });
});