import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test mb915be43", function () {
  it("should detect balance tracking discrepancy when depositing and withdrawing", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit exactly 1 ether
    const txDeposit = await instance.connect(addr1).deposit({ value: depositAmount });
    await txDeposit.wait();
    
    // Withdraw all - in the mutant, balance will be depositAmount - 1 wei
    // while credit[addr1] = depositAmount, causing underflow when balance -= oCredit
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});