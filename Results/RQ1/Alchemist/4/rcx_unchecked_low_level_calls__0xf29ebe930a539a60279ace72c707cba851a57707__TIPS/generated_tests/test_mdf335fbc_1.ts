import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant test - mdf335fbc", function () {
  it("should kill mutant by sending 1 wei and checking contract balance is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Send exactly 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    // After execution, contract balance should be zero (original behavior)
    const balance = await ethers.provider.getBalance(contractAddress);
    expect(balance).to.equal(0);
  });
});