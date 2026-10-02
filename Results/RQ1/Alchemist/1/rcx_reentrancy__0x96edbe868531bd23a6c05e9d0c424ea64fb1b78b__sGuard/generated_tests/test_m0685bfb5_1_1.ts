import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m0685bfb5 test", function () {
  it("should detect the mutant by verifying balance after Put with exact msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before using Put)
    await (await instance.connect(owner).Initialized()).wait();

    // Send exactly 1 wei to Put
    const amount = 1n;
    const tx = await instance.connect(addr1).Put(0, { value: amount });
    await tx.wait();

    // Check the recorded balance - should be exactly 1 wei in the original
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(amount);
  });
});