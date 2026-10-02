import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m2edef8f2 of B", function () {
  it("should revert when external call fails in original but not in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance to make the transfer meaningful
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();
    
    // The target address 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C is a random address with no code
    // Calling it with value will fail (revert) because it's not a payable contract
    // In the original contract, this should cause a revert
    // In the mutant (where !_s is replaced with false), it will NOT revert and will proceed to transfer balance
    
    // Attempt to call go() from a non-owner address with some ether
    // The external call to the target will fail, and in the original the whole tx reverts
    // The mutant will not revert and will try to transfer balance to owner
    await expect(
      instance.connect(addr1).go({ value: ethers.parseEther("0.1") })
    ).to.be.reverted;
    
    // Additional verification: in the mutant, the contract balance would be transferred to owner
    // so owner's balance would increase - but since we expect revert, this is just extra safety
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(ethers.parseEther("1.0")); // Balance unchanged if reverted
  });
});