import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m8d76b967 - kill test", function () {
  it("should detect msg.value-1 mutation by checking contract balance after go()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 wei to the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();

    // After execution, original would forward all 1 wei and leave 0 balance
    // Mutant forwards 0 wei (msg.value-1 = 0) and leaves 1 wei in contract
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    expect(balanceAfter).to.equal(0);
  });
});