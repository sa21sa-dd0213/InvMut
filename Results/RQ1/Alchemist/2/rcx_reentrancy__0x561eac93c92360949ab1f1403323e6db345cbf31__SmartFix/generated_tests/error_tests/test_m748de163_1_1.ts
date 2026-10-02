import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - Deposit overflow check", function () {
  it("should kill mutant m748de163 by depositing non-zero ether and checking balance increase", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance
    const initialBalance = await instance.balances(addr1.address);
    const depositAmount = ethers.parseEther("1.0");

    // Deposit from addr1
    const tx = await instance.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();

    // Check that balance increased by the deposit amount
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance - initialBalance).to.equal(depositAmount);
  });
});