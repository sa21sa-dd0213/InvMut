import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - m4418b194", function () {
  it("should detect the mutant by depositing exact amount and verifying balance after withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Try to withdraw exactly 100 wei
    // In original: balance is 100, withdrawal succeeds, final balance is 0
    // In mutant: balance is 101, withdrawal of 100 succeeds but leaves 1 wei stuck
    await instance.connect(addr1).withdraw(depositAmount);

    // Check the balance - in original it should be 0, in mutant it will be 1 wei
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(0); // This will fail on mutant because 1 wei remains
  });
});