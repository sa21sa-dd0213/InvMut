import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection", function () {
  it("should detect mutant m87629967 by verifying exact msg.value forwarded in Command call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance to ensure the test is meaningful
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Capture the balance of addr1 before the call
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Send exactly 1 ether to Command with empty data
    const tx = await instance.connect(owner).Command(addr1.address, "0x", {
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Check that addr1 received exactly 1 ether (not 1 ether - 1 wei)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    const received = balanceAfter - balanceBefore;
    
    expect(received).to.equal(ethers.parseEther("1.0"));
  });
});