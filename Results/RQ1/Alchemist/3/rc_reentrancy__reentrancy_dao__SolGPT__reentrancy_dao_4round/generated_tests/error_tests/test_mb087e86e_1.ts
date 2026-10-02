import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should detect the balance undercounting bug by depositing 1 wei and checking contract balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await instance.deposit({ value: depositAmount });
    await tx.wait();

    // Check the contract's internal balance variable
    const contractBalance = await instance.balance();
    
    // The original would record balance as 1, the mutant would record it as 0
    expect(contractBalance).to.equal(depositAmount);
  });
});