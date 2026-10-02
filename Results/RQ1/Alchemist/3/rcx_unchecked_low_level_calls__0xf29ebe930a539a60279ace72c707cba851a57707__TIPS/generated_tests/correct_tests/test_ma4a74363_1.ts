import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant ma4a74363 test", function () {
  it("should kill the mutant by verifying contract balance after go() call", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to contract so it has balance to work with
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Capture initial owner balance
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    // Call go() with some msg.value
    const callValue = ethers.parseEther("0.5");
    const tx = await instance.connect(attacker).go({ value: callValue });
    await tx.wait();

    // Check contract balance - should be 0 in original (value sent out + balance transferred)
    // but in mutant the value stays in contract, so contract will have non-zero balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(0);
  });
});