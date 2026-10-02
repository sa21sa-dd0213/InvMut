import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant m16940406 - kill by targeting address(0) change", function () {
  it("should revert when sending ETH to go() if original target reverts, but mutant succeeds", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract B (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Fund the contract with some initial ETH so balance transfer works
    const fundAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: contractAddress,
      value: fundAmount
    });
    
    // Now call go() with a small amount of ETH
    // In the original, the call to 0xC8A60... will fail (no receive/fallback or reverts)
    // In the mutant, call to address(0) succeeds, so no revert
    const goAmount = ethers.parseEther("0.5");
    
    // The test should expect revert for the original behavior
    // Since we are testing the mutant, we expect it to NOT revert
    // But to kill the mutant, we need to show the behavior differs
    // We'll call and check it succeeds (mutant behavior)
    const tx = await attacker.sendTransaction({
      to: contractAddress,
      value: goAmount,
      data: instance.interface.encodeFunctionData("go")
    });
    
    await expect(tx).to.not.be.reverted;
    
    // Additional verification: mutant should have transferred balance to owner
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    // Owner should have received the initial balance + the go() value
    expect(ownerBalanceAfter).to.be.gt(ethers.parseEther("1"));
  });
  
  it("original contract would revert when sending ETH to go()", async function () {
    // This test demonstrates the original behavior for comparison
    const [owner, attacker] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Fund the contract
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1")
    });
    
    // This call should revert because 0xC8A60... will reject the call
    const tx = attacker.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("0.5"),
      data: instance.interface.encodeFunctionData("go")
    });
    
    await expect(tx).to.be.reverted;
  });
});