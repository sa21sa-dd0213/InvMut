import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m5ec685be", function () {
  it("should revert when msg.value is exactly one wei less than contract balance (original passes, mutant fails)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 5 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("5")
    });

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(contractAddress);
    const initialAddr1Balance = await ethers.provider.getBalance(addr1.address);
    
    // Attempt to call multiplicate with 4 ether (one wei less than contract balance)
    const tx = instance.connect(addr1).multiplicate(addr1.address, {
      value: ethers.parseEther("4")
    });

    // Original contract should revert because 4 >= 5 is false
    // Mutant would execute transfer because 4+1 >= 5 is true
    await expect(tx).to.be.reverted;

    // Verify balances unchanged (sanity check for original behavior)
    const finalContractBalance = await ethers.provider.getBalance(contractAddress);
    const finalAddr1Balance = await ethers.provider.getBalance(addr1.address);
    
    expect(finalContractBalance).to.equal(initialContractBalance);
    expect(finalAddr1Balance).to.equal(initialAddr1Balance);
  });
});