import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - md6226a93", function () {
  it("should kill mutant by checking getBalance returns deposited amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // Deposit funds into addr1's balance
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check balance - original returns depositAmount, mutant returns 0
    const balance = await instance.getBalance(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});