import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m7f1e8c54 - withdraw equality check", function () {
  it("should allow partial withdrawal of less than full balance (original behavior) but mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 10 ETH from addr1
    const depositAmount = ethers.parseEther("10");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw only 3 ETH (partial withdrawal, less than full balance)
    const withdrawAmount = ethers.parseEther("3");
    
    // In original: succeeds (3 <= 10)
    // In mutant: reverts (3 == 10 is false)
    await expect(
      instance.connect(addr1).withdraw(withdrawAmount)
    ).to.be.reverted;
  });
});