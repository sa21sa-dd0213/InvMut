import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - withdraw amount not equal to balance", function () {
  it("should allow partial withdrawal on original but revert on mutant with == instead of <=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 10 ether
    await instance.connect(addr1).deposit({ value: ethers.parseEther("10") });

    // Attempt to withdraw only 3 ether (partial withdrawal)
    // On original: succeeds (3 <= 10)
    // On mutant (require(amount == balances[msg.sender])): reverts because 3 != 10
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("3"))
    ).to.be.reverted;
  });
});