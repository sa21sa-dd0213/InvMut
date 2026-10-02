import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return the correct balance after deposit, killing mutant that always returns 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial balance should be 0
    const initialBalance = await instance.getBalance(addr1.address);
    expect(initialBalance).to.equal(0);

    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // After deposit, balance should be 1 ether
    const balanceAfterDeposit = await instance.getBalance(addr1.address);
    expect(balanceAfterDeposit).to.equal(depositAmount);
  });
});