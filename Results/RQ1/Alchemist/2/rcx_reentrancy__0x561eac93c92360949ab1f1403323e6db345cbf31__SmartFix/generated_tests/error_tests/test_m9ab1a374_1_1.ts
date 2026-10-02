import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m9ab1a374", function () {
  it("should kill mutant by verifying exact balance after deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract to bypass the initialization check
    await instance.connect(owner).Initialized();

    // Set MinSum to 0 to allow any balance for Collect
    await instance.connect(owner).SetMinSum(0);

    // Deposit exactly 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Check balance - should be exactly 100 wei
    const balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});