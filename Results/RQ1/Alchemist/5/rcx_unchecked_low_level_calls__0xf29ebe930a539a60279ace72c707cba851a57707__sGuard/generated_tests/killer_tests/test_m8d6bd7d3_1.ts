import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m8d6bd7d3 test", function () {
  it("should detect the mutant by verifying ether is sent to the external address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    
    // Send some ether to the contract first via fallback to have balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Get initial balance of external address
    const initialExternalBalance = await ethers.provider.getBalance(externalAddress);
    
    // Call go() with some ether
    const tx = await instance.connect(addr1).go({ value: ethers.parseEther("0.5") });
    await tx.wait();
    
    // Check external address balance increased (original behavior)
    const finalExternalBalance = await ethers.provider.getBalance(externalAddress);
    expect(finalExternalBalance).to.equal(initialExternalBalance + ethers.parseEther("0.5"));
  });
});