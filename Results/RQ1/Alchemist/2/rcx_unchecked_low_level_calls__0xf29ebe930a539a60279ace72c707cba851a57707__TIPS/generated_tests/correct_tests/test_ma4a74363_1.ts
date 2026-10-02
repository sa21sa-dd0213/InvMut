import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant ma4a74363 test", function () {
  it("should kill the mutant by verifying external address receives ETH", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    const externalAddress = "0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C";
    
    // Get initial balance of external address
    const initialBalance = await ethers.provider.getBalance(externalAddress);
    
    // Send ETH to the contract via go()
    const sendAmount = ethers.parseEther("1.0");
    const tx = await instance.connect(addr1).go({ value: sendAmount });
    await tx.wait();
    
    // Get final balance of external address
    const finalBalance = await ethers.provider.getBalance(externalAddress);
    
    // The original sends ETH to external address, mutant sends to itself
    // If the external address received the ETH, the test passes (original behavior)
    // If not, the test fails, killing the mutant
    expect(finalBalance - initialBalance).to.equal(sendAmount);
  });
});