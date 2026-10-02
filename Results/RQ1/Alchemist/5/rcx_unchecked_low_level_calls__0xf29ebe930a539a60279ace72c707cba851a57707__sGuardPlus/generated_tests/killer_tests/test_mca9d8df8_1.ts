import { expect } from "chai";
import { ethers } from "hardhat";

describe("B - kill mutant mca9d8df8", function () {
  it("should send funds to external address, not to itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    const initialExternalBalance = await ethers.provider.getBalance(externalAddress);
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    const sendAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({ to: instance.target, value: sendAmount });
    
    // Contract now has 1 ETH from owner's direct transfer
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceBefore).to.equal(sendAmount);
    
    // Call go() from addr1 with some value
    const goTx = await addr1.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("0.5"),
      data: instance.interface.encodeFunctionData("go")
    });
    await goTx.wait();
    
    // After go(): original sends contract balance to owner, msg.value to external address
    // Mutant sends contract balance to owner, msg.value to itself (address(this))
    const finalExternalBalance = await ethers.provider.getBalance(externalAddress);
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    
    // In original: external address receives 0.5 ETH, contract balance becomes 0
    // In mutant: external address receives nothing, contract balance becomes 0.5 ETH (sent to itself)
    // Kill mutant by checking external address received funds
    expect(finalExternalBalance).to.equal(initialExternalBalance + ethers.parseEther("0.5"));
    expect(finalContractBalance).to.equal(0);
  });
});