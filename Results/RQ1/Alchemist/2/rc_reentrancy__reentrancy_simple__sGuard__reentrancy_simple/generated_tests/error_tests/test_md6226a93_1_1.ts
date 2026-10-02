import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - getBalance return removal", function () {
  it("should detect mutant by verifying getBalance returns correct balance after deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit ether from addr1
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Call getBalance and expect the returned value to equal the deposit amount
    const balance = await instance.getBalance(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});