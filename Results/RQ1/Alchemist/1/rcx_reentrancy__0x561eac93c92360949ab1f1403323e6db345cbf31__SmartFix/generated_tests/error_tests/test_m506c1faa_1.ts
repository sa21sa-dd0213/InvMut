import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m506c1faa test", function () {
  it("should kill mutant that replaces subtraction with division in Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: initialize contract and set MinSum to 0 so Collect can be called
    await instance.SetMinSum(0);
    await instance.Initialized();

    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Check initial balance is 100 wei
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);

    // Collect 30 wei
    const collectAmount = ethers.parseEther("0.00000000000000003"); // 30 wei
    await instance.connect(addr1).Collect(collectAmount);

    // Expected remaining balance after original subtraction: 100 - 30 = 70 wei
    // Mutant with division would give: 100 / 30 = 3 wei (integer division)
    const expectedBalance = depositAmount - collectAmount; // 70 wei
    expect(await instance.balances(addr1.address)).to.equal(expectedBalance);
  });
});