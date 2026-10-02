import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant by depositing 1 wei and verifying the balance increases correctly", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // Deposit exactly 1 wei
    const tx = await instance.connect(owner).deposit({ value: 1 });
    await tx.wait();

    // Check that the balance increased by exactly 1 wei
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance - initialBalance).to.equal(1n);
  });
});