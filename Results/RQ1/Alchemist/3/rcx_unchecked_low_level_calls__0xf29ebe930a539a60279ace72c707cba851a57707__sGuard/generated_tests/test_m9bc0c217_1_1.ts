import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - msg.value-1", function () {
  it("should detect that 1 wei remains in contract when sending 1 wei to go()", async function () {
    const [owner, sender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei to go()
    const tx = await sender.sendTransaction({
      to: await instance.getAddress(),
      value: 1,
      data: instance.interface.encodeFunctionData("go")
    });
    await tx.wait();

    // Check contract balance - original would forward all 1 wei and then transfer balance to owner, leaving 0
    // Mutant forwards 0 wei (msg.value-1) then transfers contract balance to owner, but 1 wei remains
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});