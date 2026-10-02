import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m6dd0e369 test", function () {
  it("should detect mutant that subtracts 1 from msg.value in addToBalance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Add to balance with exact deposit
    const tx = await instance.connect(addr1).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check stored balance - on original it equals deposit, on mutant it's deposit-1 wei
    const balance = await instance.getBalance(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});