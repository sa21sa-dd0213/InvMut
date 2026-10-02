import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m98a88501 test", function () {
  it("should detect mutant that uses msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 ether to go() - the mutant will try to send 1 ether + 1 wei
    const sendAmount = ethers.parseEther("1.0");
    
    // The call should succeed on original but fail on mutant because target.call
    // will try to send more than contract received
    await expect(
      instance.connect(addr1).go({ value: sendAmount })
    ).to.be.reverted;
  });
});