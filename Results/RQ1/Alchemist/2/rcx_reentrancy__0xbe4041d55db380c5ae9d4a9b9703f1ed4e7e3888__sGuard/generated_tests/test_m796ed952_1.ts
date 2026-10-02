import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m796ed952 test", function () {
  it("should detect mutant that adds 1 to msg.value in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call Put with exactly 1 wei
    const tx = await instance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();

    // Check the stored balance - original would store 1, mutant stores 2
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(1);
  });
});