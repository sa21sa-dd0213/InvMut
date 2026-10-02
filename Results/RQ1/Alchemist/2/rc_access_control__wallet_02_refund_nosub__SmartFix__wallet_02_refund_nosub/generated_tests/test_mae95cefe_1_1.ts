import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mae95cefe by depositing 1 wei and verifying contract balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const tx = await instance.connect(owner).deposit({ value: 1 });
    await tx.wait();

    // Check the contract's balance after deposit
    const contractBalance = await ethers.provider.getBalance(instance.target);

    // On the original contract, contract balance would be 1 wei
    // On the mutant, it would be 0 wei (since msg.value-1 = 0)
    expect(contractBalance).to.equal(1n);
  });
});