import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m6f3402b9 by verifying exact balance after depositing 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Check the balance recorded in the contract mapping
    const recordedBalance = await instance.balances(addr1.address);
    
    // On the original, this should be 1. On the mutant (msg.value-1), it will be 0.
    expect(recordedBalance).to.equal(depositAmount);
  });
});